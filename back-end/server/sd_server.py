from flask import Flask, render_template, request, make_response
from flask_cors import *
import torch
import json
import clip
import base64
from io import BytesIO
from util import *
# from workflow import *
import scipy.cluster.hierarchy as sch
from workflow import tfidf_of_cluster
from diffusers import StableDiffusionPipeline, DPMSolverMultistepScheduler
import torch
import sys
import numpy
import time
from config import *
import random

app = Flask(__name__)
CORS(app, supports_credentials=True)

device_id = sys.argv[1]
device = "cuda:" + device_id
print(device)

# Use the DPMSolverMultistepScheduler (DPM-Solver++) scheduler here instead
print("Begin to load model")
pipe = StableDiffusionPipeline.from_pretrained(model_id, torch_dtype=torch.float16, force_download=True)
pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config)

print("Set device")
pipe = pipe.to(device)
print("Start inference")

@app.route('/sd')
def sd():
    args = request.args
    epo = int(args.get('epo'))
    device_id = int(args.get('device_id'))
    scale_left = float(args.get('scale_left'))
    scale_right = float(args.get('scale_right'))
    prompt = args.get('prompt')
    negative_prompt = args.get('negative_prompt')

    # set scale list
    w_list = []
    while (scale_left <= scale_right):
        w_list.append(scale_left)
        scale_left += 0.5
    w_len = len(w_list)
    print('Guidance scale sample list:', w_list)
    
    result_dict = []
    for i in range(int(epo)):
        st = time.time()
        scale = w_list[random.randrange(0, w_len)]

        # set seed
        generators = []
        seed_list = []
        for i in range(n_images_per_prompt):
            seed = random.randrange(2**32 - 1)
            generator = torch.Generator(device='cuda')
            generator = generator.manual_seed(seed)
            generators.append(generator)
            seed_list.append(seed)

        if len(negative_prompt) == 0:
            print('negative_prompt is None')
            images = pipe(prompt = prompt, height = sd_height, width = sd_width, num_inference_steps = n_inference_steps,
                guidance_scale = float(scale), num_images_per_prompt = n_images_per_prompt, generator  = generators)
        else:
            print('negative_prompt is', negative_prompt)
            images = pipe(prompt = prompt, height = sd_height, width = sd_width, num_inference_steps = n_inference_steps,
                guidance_scale = float(scale), negative_prompt = negative_prompt, num_images_per_prompt = n_images_per_prompt, generator  = generators)
        print("[Infer time: {0}]".format(time.time() - st))

        for j in range(0, n_images_per_prompt):
            inner = {}
            image = images.images[j]
            inner['id'] = str( device_id * n_images_per_prompt * epo + n_images_per_prompt * i + j)
            inner['img'] = getImgStr(image)
            inner['x'] = str(sd_width)
            inner['y'] = str(sd_height)
            inner['guidanceScale'] = str(scale)
            inner['seed'] = str(seed_list[j])

            result_dict.append(inner)

    return json.dumps(result_dict)

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=False, threaded=True, port = (5005 + int(device_id)))









