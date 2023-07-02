import torch
import clip
import faiss
import math
import pickle
from tqdm import tqdm
import faiss.contrib.torch_utils
from random import choice
from PIL import Image
import numpy as np
import matplotlib.pyplot as plt
from sklearn.manifold import TSNE
import datasets
from util import *
import scipy.cluster.hierarchy as sch
from nltk.corpus import stopwords
from nltk import word_tokenize

# Device configuration and model loading
device = "cuda" if torch.cuda.is_available() else "cpu"
print('[Workflow] device', device)

# Load data from diffusionDB
def load_data(n_imgs, preprocess_img, preprocess_text, start_index=0):
	dataset = datasets.load_dataset('poloclub/diffusiondb', '2m_first_100k')

	dataset_n_imgs = dataset["train"][start_index: start_index+n_imgs]
	img_list = dataset_n_imgs["image"]
	text_list = dataset_n_imgs["prompt"]
	cfg_list = dataset_n_imgs["cfg"]
	seed_list = dataset_n_imgs["seed"]
	
	process_image_list = [preprocess_img(img) for img in img_list]
	process_text_list = [preprocess_text(text, max_duplicate=3, max_len=40) for text in text_list]
	return process_image_list, process_text_list


# Encode the text
def encode_text(text_list, encode_model):
	text_tensor = clip.tokenize(text_list).to(device)
	with torch.no_grad():
		text_features = encode_model.encode_text(text_tensor)
		print('text_features', text_features.shape)
	return text_features.cpu()


# Encode the image and text
def encode_image_and_text(image_list, text_list, encode_model):
	image_tensor = torch.tensor(np.stack(image_list)).to(device)
	text_tensor = clip.tokenize(text_list).to(device)

	with torch.no_grad():
		image_features = encode_model.encode_image(image_tensor)
		text_features = encode_model.encode_text(text_tensor)
		combined_feature = torch.cat((image_features, text_features), 1)

	return image_features, text_features, combined_feature


def load_and_encode_pickle_data(num_batch, save_dir, encode_model):
	image_features_list, text_features_list, combined_feature_list = [], [], []
	filter_text_list, db_id_list = [], []

	for i in tqdm(range(num_batch)):
		process_image_batch, process_text_batch = load_data_from_pickle(save_path=save_dir+str(i+1)+'.pickle')
		filter_image_batch, filter_text_batch = [], []
		for j in range(batch_size):
			if not contains_chinese(process_text_batch[j]) and not contains_special_word(process_text_batch[j]) and not contains_special_chars(process_text_batch[j]):
				filter_image_batch.append(process_image_batch[j])
				filter_text_batch.append(process_text_batch[j])
				filter_text_list.append(process_text_batch[j])
				db_id_list.append(i*batch_size+j)
		image_features, text_features, combined_feature = encode_image_and_text(filter_image_batch, filter_text_batch, encode_model)
		image_features_list.append(image_features)
		text_features_list.append(text_features)
		combined_feature_list.append(combined_feature)
	
	stake_image_features = torch.cat(image_features_list, dim=0)
	stake_text_features = torch.cat(text_features_list, dim=0)
	stake_combined_features = torch.cat(combined_feature_list, dim=0)
	return stake_image_features, stake_text_features, stake_combined_features, filter_text_list, db_id_list


# Embed the feature into 2D space
def embed_feature(encode_feature):
	# Use TSNE for projection
	embed_position = TSNE(n_components=2, init='random', perplexity=10, metric='cosine').fit_transform(encode_feature)
	# Use UMAP for projection
	# embed_position = umap.UMAP(n_neighbors=5, min_dist=0.001, metric='cosine').fit_transform(encode_feature)
	return embed_position
	

def search_image_with_text(image_features, text_features, n_search=500):
	image_features = image_features.to(device)
	text_features = text_features.to(device)

	# normalized features
	image_features = image_features / image_features.norm(dim=1, keepdim=True)
	text_features = text_features / text_features.norm(dim=1, keepdim=True)

	# cosine similarity as logits
	logits_per_image = image_features @ text_features.t()
	logits_per_text = logits_per_image.t()

	probs_per_text = logits_per_text.softmax(dim=-1)
	_, search_index = torch.topk(probs_per_text, n_search, dim=-1, largest=True, sorted=True, out=None)
	return search_index[0].cpu()


def get_hierarchical_cluster(tree_node, id_to_node, image_to_level, keyword_to_node, text_list, image_position, threshold=8):
	node_id = tree_node.get_id()
	if (tree_node.is_leaf() == False):
		left_child, id_to_node, image_to_level, keyword_to_node = get_hierarchical_cluster(
			tree_node.get_left(), id_to_node, image_to_level, keyword_to_node, text_list, image_position)
		right_child, id_to_node, image_to_level, keyword_to_node = get_hierarchical_cluster(
			tree_node.get_right(), id_to_node, image_to_level, keyword_to_node, text_list, image_position)
		node_level = max(left_child.node_level, right_child.node_level) + 1
		all_child = left_child.child_id_list + right_child.child_id_list
		select_image = is_two_cluster_close(left_child, right_child, threshold)
	else:
		node_level = 1
		select_image = True
		all_child = [node_id]
		image_to_level[node_id] = 1
	# Create class object for current image cluster
	cluster_node = Cluster(tree_node, node_level, all_child)
	id_to_node[node_id] = cluster_node
	# Get the representative image of the cluster
	if select_image:
		selected_image = cluster_node.get_cluster_representation(image_position)
		image_to_level[selected_image] = node_level
	else:
		if left_child.selected_image is not None:
			image_to_level[left_child.selected_image] = 100
		if right_child.selected_image is not None:
			image_to_level[right_child.selected_image] = 100
	# Limit the number of node in the cluster
	if len(all_child) > 3 and len(all_child) < 20:
		# Get the tf-idf of the cluster
		tfidf_dict = tfidf_of_cluster(all_child, text_list)
		keyword_to_node = map_keyword_best_node(node_id, tfidf_dict, keyword_to_node)
	return  cluster_node, id_to_node, image_to_level, keyword_to_node


# Calculate the tf-idf values of the keywords in the cluster
def tfidf_of_cluster(cluster_id_list, text_list, num_of_keyword=1):
	selected_prompt, all_prompt = [], []
	for i in range(len(text_list)):
		if i in cluster_id_list:
			selected_prompt.append(text_list[i])
		else:
			all_prompt.append(text_list[i])
	connect_selected_prompt = ' | '.join(selected_prompt)
	all_prompt.append(connect_selected_prompt)
	process_all_prompt = [process_text_for_tfidf(prompt.lower()) for prompt in all_prompt]

	tfidf_dict = tfidf(text_list=process_all_prompt, stop_words=None)
	
	total_keyword_str = ''
	prompt_keywords = {}
	
	for (keyword, value) in tfidf_dict.items():
		if len(prompt_keywords.keys()) >= num_of_keyword: break
		if '|' in keyword: continue
		if str_one_in_str_two(keyword, total_keyword_str): continue
		if value < 0.01: continue
		if keyword in stopwords.words('english'): continue

		total_keyword_str += keyword + ' <(~_~)> ' # Separator
		origin_keyword = ' '.join(keyword.split('_'))
		prompt_keywords[origin_keyword] = value
	return prompt_keywords


def map_keyword_best_node(node_id, tfidf_dict, keyword_to_node):
	keyword_best_node_dict, keyword_max_tfidf_dict = keyword_to_node
	for keyword, tfidf_value in tfidf_dict.items():
		if keyword in keyword_max_tfidf_dict:
			if tfidf_value > keyword_max_tfidf_dict[keyword]:
				keyword_max_tfidf_dict[keyword] = tfidf_value
				keyword_best_node_dict[keyword] = node_id
		else:
			keyword_max_tfidf_dict[keyword] = tfidf_value
			keyword_best_node_dict[keyword] = node_id
	return [keyword_best_node_dict, keyword_max_tfidf_dict]


if __name__ == '__main__':
	model, preprocess_img = clip.load("ViT-B/32", device=device, download_root='../.cache/clip')
	num_images = 100000
	batch_size = 1000

	for i in tqdm(range(int(num_images/batch_size))):
		# img_batch, process_image_batch, text_batch, process_text_batch, seed_batch, cfg_batch = load_data(batch_size, preprocess_img, preprocess_text, start_index=i*batch_size)
		process_image_batch, process_text_batch = load_data(batch_size, preprocess_img, preprocess_text, start_index=i*batch_size)
		save_data([process_image_batch, process_text_batch], save_path='../.cache/diffusiondb-process/part-'+str(i+1)+'.pickle')

	image_features, text_features, combined_features, db_id_list = load_and_encode_pickle_data(num_batch=int(num_images/batch_size))
	print('image_features', image_features.shape)
	print('text_features', text_features.shape)
	print('combined_features', combined_features.shape)
	print('db_id_list', db_id_list[: 30])
	
