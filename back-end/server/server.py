import os 
os.environ["CUDA_DEVICE_ORDER"] = "PCI_BUS_ID"
os.environ['CUDA_VISIBLE_DEVICES'] = "0"  # Use 0-index GPU for server pipeline

from flask import Flask, render_template, request, make_response
from flask_cors import *
import numpy as np
import torch
import math
import json
import clip
import base64
import datasets
from io import BytesIO
from util import *
from workflow import *
import scipy.cluster.hierarchy as sch
from workflow import tfidf_of_cluster
from config import *
from PIL import Image
import random

app = Flask(__name__)
CORS(app, supports_credentials=True)

# Global valuable for server
all_origin_img_list, all_process_img_list, all_process_text_list, all_seed_list, all_cfg_list = [], [], [], [], []
sd_cfg_list, embed_position = [], []

# Device configuration and model loading
print("Start to load dataset from poloclub/diffusiondb...")
dataset = datasets.load_dataset('poloclub/diffusiondb', '2m_first_100k')
dataset.save_to_disk('poloclub/diffusiondb_2m_first_100k')
# dataset = datasets.load_from_disk("./poloclub/diffusiondb_2m_first_100k")
print(dataset["train"])

device = "cuda" if torch.cuda.is_available() else "cpu"
print('[Server] device', device)
model, preprocess_img = clip.load("ViT-B/32", device=device, download_root='../.cache/clip')

###################   Prepare diffisonDB  ###########################
print('Start to load features from cache...') 
db_image_features, db_text_features, db_combined_feature, db_filter_text_list, db_id_list = load_data_from_pickle(
    save_path='../.cache/diffusiondb-feature/feature.pickle')


@app.route('/image_overview')
def get_image_overview():
    request_data = requestParse(request)
    prompt = request_data['prompt']
    negative_prompt = request_data['negativePrompt']
    guidanceScale = request_data['guidanceScale'].split(',')
    numberOfGeneration = int(request_data['numberOfGeneration'])
    scale_left, scale_right = [float(i) for i in guidanceScale]
    n_sd = math.ceil(numberOfGeneration / (n_device * n_images_per_prompt))

    global all_origin_img_list, all_process_img_list, all_process_text_list, all_seed_list, all_cfg_list
    global sd_cfg_list, embed_position

    ###################     stable diffison   ######################
    # Stable diffusion produce data
    sd_data = sd_data_produce(prompt, negative_prompt, scale_left, scale_right, n_sd)

    sd_origin_image_list, sd_process_text_list, sd_seed_list, sd_cfg_list = [], [], [], []
    process_prompt = preprocess_text(prompt, max_duplicate=3, max_len=40)
    for i in range(n_device):
        for j in range(n_sd * n_images_per_prompt):
            if len(sd_origin_image_list) >= numberOfGeneration: break
            sd_origin_image_list.append(base64_to_image(sd_data[i][j]['img']))
            sd_process_text_list.append(process_prompt)
            sd_seed_list.append(sd_data[i][j]['seed'])
            sd_cfg_list.append(sd_data[i][j]['guidanceScale'])

    ###################     diffisonDB  ###########################    
    # Search image for DiffusionDB
    prompt_feature = encode_text(text_list=[prompt], encode_model=model)
    search_index = search_image_with_text(db_image_features, prompt_feature, n_search)
    search_origin_image, search_process_image, search_process_text, search_seed_list, search_cfg_list = [], [], [], [], []
    for index in search_index:
        db_item = dataset['train'][db_id_list[index]]
        search_origin_image.append(db_item['image'])
        search_process_image.append(preprocess_img(db_item['image']))
        search_process_text.append(db_filter_text_list[index])
        search_seed_list.append(db_item['seed'])
        search_cfg_list.append(db_item['cfg'])

    # Combine img and text from stable diffusion and diffusionDB
    all_origin_img_list = sd_origin_image_list + search_origin_image
    all_process_img_list = [preprocess_img(img) for img in sd_origin_image_list] + search_process_image
    all_process_text_list = sd_process_text_list + search_process_text
    all_seed_list = sd_seed_list + search_seed_list
    all_cfg_list = sd_cfg_list + search_cfg_list

    # Using the image list for embedding
    image_features, text_features, combined_feature = encode_image_and_text(all_process_img_list, all_process_text_list, encode_model=model)
    embed_position = embed_feature(combined_feature.cpu())
    
    image_result_list = []
    for i in range(numberOfGeneration + n_search):
        data_item = {}
        data_item['id'] = str(i)
        data_item['x'] = str(embed_position[i][0])
        data_item['y'] = str(embed_position[i][1])

        compress_image = compress_PIL_image(all_origin_img_list[i])
        data_item['img'] = getImgStr(compress_image)
        img_type = 'generate' if i < numberOfGeneration else 'search'
        data_item['type'] = img_type

        image_result_list.append(data_item)

    result_dict = {}
    result_dict['image'] = image_result_list
    return json.dumps(result_dict)


@app.route('/update_image_overview')
def update_image_overview():
    request_data = requestParse(request)
    satisfied_image_list = request_data['satisfiedImage'].split(',')
    satisfied_image_list = [int(image_id) for image_id in satisfied_image_list]
    num_image = len(all_process_text_list)

    satisfied_embed_position = [embed_position[image_id] for image_id in satisfied_image_list]
    satisfied_process_text = [all_process_text_list[image_id] for image_id in satisfied_image_list]

    rootNode = sch.to_tree(sch.linkage(satisfied_embed_position))
    position_range = np.max(np.max(embed_position, axis=0) - np.min(embed_position, axis=0))
    print('position_range', position_range)
    _, id_to_node, image_to_level, keyword_to_node = get_hierarchical_cluster(
        tree_node=rootNode, id_to_node={}, image_to_level={}, keyword_to_node=[{}, {}], 
        text_list=satisfied_process_text, image_position=satisfied_embed_position, threshold=position_range/15)
    image_id_to_level = {satisfied_image_list[index]: level for index, level in image_to_level.items()}
    level_list = [image_id_to_level[index] if index in image_id_to_level else -1 for index in range(num_image)]

    keyword_best_node_dict = keyword_to_node[0]
    text_result_list = []
    for keyword, node_id in keyword_best_node_dict.items():
        data_item = {}
        data_item['text'] = keyword
        data_item['level'] = str(id_to_node[keyword_best_node_dict[keyword]].node_level)
        keyword_position, text_child_id_set = get_keyword_position(
            keyword, satisfied_process_text, id_to_node[node_id].child_id_list, satisfied_embed_position, position_range)
        data_item['x'] = str(keyword_position[0])
        data_item['y'] = str(keyword_position[1])
        data_item['related_images'] = ','.join(list(text_child_id_set))
        text_result_list.append(data_item)

    result_dict = {}
    result_dict['text'] = text_result_list
    result_dict['image_to_level'] = level_list

    return json.dumps(result_dict)


@app.route('/single_image_detail')
def get_single_image_detail():
    request_data = requestParse(request)
    image_id = int(request_data['id'])

    image_item = {}
    image_item['img'] = getImgStr(all_origin_img_list[i])
    image_item['prompt'] = all_process_text_list[i]
    image_item['guidanceScale'] = all_cfg_list[i]
    image_item['randomSeed'] = all_seed_list[i]

    result_dict = {'image': [image_item]}

    return json.dumps(result_dict)


@app.route('/image_detail')
def get_img_detail():
    request_data = requestParse(request)
    image_id_list = request_data['id'].split(',')
    image_id_list = [int(image_id) for image_id in image_id_list]
    print('image_id_list', image_id_list)
    
    global all_origin_img_list, all_process_text_list
    select_cfg_list = [all_cfg_list[i] for i in image_id_list]

    result_dict = {}
    image_detail_list = []
    guidanceScale_count = {}
    for i in image_id_list:
        inner = {}
        inner['img'] = getImgStr(all_origin_img_list[i])
        inner['prompt'] = all_process_text_list[i]
        inner['guidanceScale'] = all_cfg_list[i]
        inner['randomSeed'] = all_seed_list[i]
        image_detail_list.append(inner)
    
    tfidf_dict = tfidf_of_cluster(image_id_list, all_process_text_list, num_of_keyword=10)
 
    cfg_count = {'local': value_count(select_cfg_list, min_value=0, max_value=50, num_interval=10)}
    
    result_dict['image'] = image_detail_list
    result_dict['text'] = list(tfidf_dict.keys())

    result_dict['guidance'] = cfg_count
    return json.dumps(result_dict)


@app.route('/image_rating')
def get_image_rating():
    request_data = requestParse(request)
    keyword_1 = request_data['keyword_1'] + ' image'
    if len(request_data['keyword_2']) == 0:
        keyword_2 = 'not' + keyword_1
    else:
        keyword_2 = request_data['keyword_2'] + ' image'

    text = clip.tokenize([keyword_1, keyword_2]).to(device)
    with torch.no_grad():
        process_image_tensor = torch.stack(all_process_img_list, dim=0).to(device)
        logits_per_image, logits_per_text = model(process_image_tensor, text)
        probs = logits_per_image.softmax(dim=-1).cpu().numpy()
    probs_first_values = probs[:, 1]
    probs_value_count = value_count(probs_first_values, min_value=0, max_value=1, num_interval=10)
    print('probs_value_count', probs_value_count)
    result_dict = {
        'rating': [float(i) for i in probs_first_values], 
        'count': [int(i) for i in probs_value_count]}
    return json.dumps(result_dict)
    
if __name__ == '__main__':
    app.run(host='0.0.0.0', threaded=True, port=5001)
