from sklearn.feature_extraction.text import CountVectorizer, TfidfTransformer, TfidfVectorizer
import pandas as pd
import re
import math
import base64
import random
import string
import pickle
from io import BytesIO
import numpy as np
from config import *
import time
import threading
from urllib.parse import urlencode
import requests
import json
from PIL import Image
from gensim.models.phrases import Phrases, ENGLISH_CONNECTOR_WORDS

# stable diffusion data
sd_data = {}

# Phrase model
phrase_model = Phrases.load("../.cache/gensim/phrases.pkl")


def preprocess_text(text, max_duplicate=3, max_len=70):
    duplicate_count = {}
    process_word_list = []
    text = text.replace(' ,', ',').replace(',', ' ,').replace(' , ,', ' ,').replace(',', ', ')
    text = text.replace('(', ' ( ').replace(')', ' ) ').replace('#', ' # ')
    for word in text.split():
        if 'http' in word or '.jpg' in word or '/' in word: continue 
        if word in duplicate_count:
            duplicate_count[word] += 1
        else:
            duplicate_count[word] = 1
        if duplicate_count[word] <= max_duplicate:
            process_word_list += word.split('_')
    process_text = ' '.join(process_word_list[:max_len])
    return process_text


def process_text_for_tfidf(text):
    process_text = ''
    sub_text_list = re.split(',|\.|/|;|\'|`|\||\[|\]|<|>|\?|:|"|\{|\}|\~|!|@|#|\$|%|\^|&|\(|\)|-|=|\_|\+|，|。|、|；|‘|’|【|】|·|！|…|（|）', text)
    
    for sub_text in sub_text_list:
        sub_text_strip = sub_text.strip()
        process_sub_text = ' '.join(phrase_model[sub_text_strip.split()])
        process_text += process_sub_text + ' | '

    return process_text


def tfidf(text_list, stop_words):
    vectorizer = CountVectorizer(
        stop_words=stop_words, token_pattern="(?u)\\b\\w+\\b", ngram_range=(1, 1))
    X = vectorizer.fit_transform(text_list)
    r = pd.DataFrame(X.toarray(), columns=vectorizer.get_feature_names_out())

    transformer = TfidfTransformer(
        norm='l2', smooth_idf=False, sublinear_tf=False)
    Z = transformer.fit_transform(X)
    r = pd.DataFrame(Z.toarray(), columns=vectorizer.get_feature_names_out())

    tfidf_dict = dict(r.loc[len(text_list)-1].sort_values(ascending=False))

    tfidf_dict_weight = {
        keyword: value * (1 + (1 + 0.1 * keyword.count('_')))
        for (keyword, value) in tfidf_dict.items() if value > 0.02}
    tfidf_dict_rank = dict(sorted(tfidf_dict_weight.items(), key=lambda x: x[1], reverse=True))
    return tfidf_dict_rank


def requestParse(req_data):
    if req_data.method == "POST":
        if req_data.json != None:
            data = req_data.json
        else:
            data = req_data.form
    elif req_data.method == "GET":
        data = req_data.args
    return data


def compress_PIL_image(image, compress_rate=0.2):
    width, height = image.size
    resize_image = image.resize(
        (int(width * compress_rate), int(height * compress_rate)))
    return resize_image


def getImgStr(img):
    output_buffer = BytesIO()
    img.save(output_buffer, format='png')
    byte_data = output_buffer.getvalue()
    image_str = base64.b64encode(byte_data).decode('utf-8')
    return image_str

def base64_to_image(base64_str):
    image = base64.b64decode(base64_str, altchars=None, validate=False)
    image = BytesIO(image)
    image = Image.open(image)
    return image

class Cluster:
    def __init__(self, node, node_level, child_id_list):
        self.node = node
        self.node_level = node_level
        self.child_id_list = child_id_list
        self.center_position = None
        self.selected_image = None
    
    def get_cluster_representation(self, position_list):
        child_position_list = []
        for child_id in self.child_id_list:
            child_position_list.append(position_list[child_id])
        self.center_position = np.mean(child_position_list, axis=0)
        distance_list = [math.dist(child_position, self.center_position)
                        for child_position in child_position_list]
        selected = distance_list.index(min(distance_list))
        self.selected_image = self.child_id_list[selected]
        return self.selected_image

def is_two_cluster_close(left_child, right_child, threshold):
    if left_child.center_position is None or right_child.center_position is None:
        return False
    cluster_distance = math.dist(left_child.center_position, right_child.center_position)
    return cluster_distance < threshold


def get_keyword_position(keyword, text_list, child_id_list, embed_position, position_range):
    child_node_position = []
    text_child_id_set = set()    # The list of child id which contain keyword in text
    for child_id in child_id_list:
        text = text_list[child_id].lower()
        # print('text', text)
        for _ in range(text.count(keyword.lower())):
            child_node_position.append(embed_position[child_id])
            text_child_id_set.add(str(child_id))
    if len(child_node_position) == 0: return [0.0, 0.0]
    keyword_pos = np.mean(child_node_position, axis=0)
    keyword_pos_random = [
        keyword_pos[0] + position_range * random.choice([-1, 1]) * random.uniform(0.01, 0.03), 
        keyword_pos[1] + position_range * random.choice([-1, 1]) * random.uniform(0.01, 0.03)]
    return keyword_pos_random, text_child_id_set


# stable diffusion
def sd_data_produce(prompt: str, negative_prompt: str, scale_left: float, scale_right: float, n_epo=1):
    thread_list = []
    for i in range(0, n_device):
        t = threading.Thread(target = sd_infer, args=(i, scale_left, scale_right, prompt, negative_prompt, n_epo))
        thread_list.append(t)
    
    for t in thread_list:
        t.setDaemon(True)
        t.start()

    for t in thread_list:
        t.join()
    
    return sd_data


def sd_infer(device_num: int, scale_left: float, scale_right: float, prompt: str, negative_prompt: str, n_epo=1):
    port = 5005 + device_num
    params = {
        'epo': n_epo,
        'device_id': device_num,
        'scale_left': scale_left,
        'scale_right': scale_right,
        'prompt': prompt,
        'negative_prompt': negative_prompt,
    }
    param_encode = urlencode(params)
    url = sd_ip + str(port) + '/sd' + '?' + param_encode
    print("url: {0}".format(url))
    response = requests.get(url=url)
    data = json.loads(response.text)
    sd_data[device_num] = data


def value_count(value_list, min_value, max_value, num_interval):
    res_count = [0  for _ in range(num_interval)]
    step = (max_value - min_value) / num_interval
    for item in value_list:
        item = min(max(float(item), min_value), max_value-0.001)
        res_count[int((item - min_value)//step)] += 1
    return res_count


def save_data(data, save_path):
	with open(save_path, 'wb') as f:
		pickle.dump(data, f, -1)
	return 'success'
	

def load_data_from_pickle(save_path):
	pickle_file = open(save_path, 'rb')
	data = pickle.load(pickle_file)
	pickle_file.close()
	return data


def contains_chinese(check_str):
    for ch in check_str:
        if u'\u4e00' <= ch <= u'\u9fff':
            return True
    return False

def contains_special_word(check_str):
    # These words may cause errors when using CLIP model
    special_word_list = ['I.G', 'Ελληνίδες', 'advertisingandmarketing', 'personaldevelopment', '00000000000000000000000', '2659933695 3148516607']
    for special_word in special_word_list:
        if special_word in check_str:
            return True
    return False


def contains_special_chars(check_str):
    pattern = r"[^A-Za-z0-9\s\.,;:!?(){}\[\]<>\"'@#$%^&*+=_\-\/\\]+"
    return bool(re.search(pattern, check_str))


def str_one_in_str_two(str_one, str_two):
    for word in str_one.split():
        if word in str_two:
            return True
    return False