import axios from "axios";
import { imageData, textData } from "../models/imageBrowser";
import { parameterData } from "../models/parameter";
import { guidanceInfo, imageDetailInfo } from "../models/localExploration";

axios.defaults.baseURL = "http://127.0.0.1:5001";

export interface overviewData {
  image: imageData[];
  text: textData[];
}

export interface detailData {
  imageDetail: imageDetailInfo[];
  keywords: string[];
  guidanceInfoData: guidanceInfo;
}

export interface idGradeData {
  id: number;
  grade: number;
}

export interface imageClustingData {
  grade: number;
  imageNum: number;
}

export interface gradeData {
  idGradeArr: idGradeData[];
  imageClustingArr: imageClustingData[];
}

export interface levelData {
  imageLevelData: number[];
  textDataArr: textData[];
}

axios.interceptors.request.use(
  (config) => {
    return config;
  },
  (err) => {
    return Promise.reject(err);
  }
);

axios.interceptors.response.use(
  (response) => {
    if (response.status === 200) {
      return Promise.resolve(response);
    } else {
      return Promise.reject(response);
    }
  },
  (err) => {
    return Promise.reject(err);
  }
);

export const getAllImageInfo = async (
  parameter: parameterData
): Promise<overviewData> => {
  return new Promise((resolve, reject) => {
    axios
      .get("/image_overview", {
        params: {
          prompt: parameter.promptData,
          negativePrompt: parameter.negativePromptData,
          guidanceScale: parameter.guidanceScaleData.join(","),
          numberOfGeneration: parameter.randomSeedData,
        },
      })
      .then((res) => {
        const imageInfo: imageData[] = [];
        for (let i = 0; i < res.data.image.length; i++) {
          const currentImage: imageData = { ...res.data.image[i] };
          imageInfo.push(currentImage);
        }
        const newOverviewData: overviewData = {
          image: imageInfo,
          text: [],
        };

        resolve(newOverviewData);
      })
      .catch((err) => {
        reject(err.data);
      });
  });
};

export const getImageDetail = async (
  parameter: string[]
): Promise<detailData> => {
  return new Promise((resolve, reject) => {
    axios
      .get("/image_detail", {
        params: {
          id: parameter.join(","),
        },
      })
      .then((res) => {
        const newDetailData: detailData = {
          imageDetail: res.data.image,
          keywords: res.data.text,
          guidanceInfoData: res.data.guidance,
        };
        resolve(newDetailData);
      })
      .catch((err) => {
        reject(err.data);
      });
  });
};

export const getImageGrade = async (
  parameter: string[]
): Promise<gradeData> => {
  return new Promise((resolve, reject) => {
    axios
      .get("/image_rating", {
        params: {
          keyword_1: parameter[0],
          keyword_2: parameter[1],
        },
      })
      .then((res) => {
        const countInfo: number[] = res.data.count;
        const singleGrade = 1.0 / countInfo.length;
        const imageClusting: imageClustingData[] = [];
        imageClusting.push({ grade: 0, imageNum: 0 });
        for (let i = 0; i < countInfo.length; i++) {
          imageClusting.push({
            grade: singleGrade * (i + 1) - singleGrade / 2,
            imageNum: countInfo[i],
          });
        }
        imageClusting.push({ grade: 1, imageNum: 0 });
        const ratingInfo: number[] = res.data.rating;
        const idGrade: idGradeData[] = [];
        for (let i = 0; i < ratingInfo.length; i++) {
          idGrade.push({ id: i, grade: ratingInfo[i] });
        }
        resolve({
          idGradeArr: idGrade,
          imageClustingArr: imageClusting,
        });
      })
      .catch((err) => {
        reject(err.data);
      });
  });
};

export const getSatisfiedImageLevel = async (
  parameter: string[]
): Promise<levelData> => {
  return new Promise((resolve, reject) => {
    axios
      .get("/update_image_overview", {
        params: {
          satisfiedImage: parameter.join(","),
        },
      })
      .then((res) => {
        const newLevelData: levelData = {
          imageLevelData: res.data.image_to_level,
          textDataArr: res.data.text,
        };
        resolve(newLevelData);
      })
      .catch((err) => {
        reject(err.data);
      });
  });
};
