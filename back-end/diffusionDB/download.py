import numpy as np
from datasets import load_dataset
from PIL import Image
import torch
import numpy as np
import cv2
import base64
import clip

def load_data():
    try:
        dataset = load_dataset('poloclub/diffusiondb', '2m_first_100k')
    except Exception as e:
        load_data()
load_data()
print("done load data")
print(dataset)
print(dataset["train"][:1])

img = dataset["train"][:1]["image"]
print(img[0])
# img = preprocess(img)
print(base64.b64encode(img[0].tobytes()))
