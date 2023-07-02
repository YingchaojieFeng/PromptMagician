import { getAllImageInfo } from "../services";
import { Dispatch } from "../store";
import { parameterData } from "./parameter";

export interface imageData {
  img: string;
  id: string;
  x: number;
  y: number;
  type: string;
}

export interface textData {
  text: string;
  x: number;
  y: number;
  level: number;
  related_images: string;
}

export interface overviewData {
  image: imageData[];
  text: textData[];
  imageLevel: number[];
}

type State = {
  imageArr: Array<imageData>;
  textArr: Array<textData>;
  selectedImage: Array<string>;
  imageLevel: number[];
  isShowOverlay: boolean;
};

const initialState: State = {
  imageArr: [],
  textArr: [],
  selectedImage: [],
  imageLevel: [],
  isShowOverlay: false,
};

const imageBrowser = {
  state: initialState,

  reducers: {
    updateImageBrowserState(state: State, payload: Partial<State>) {
      return {
        ...state,
        ...payload,
      };
    },
  },

  effects: (dispatch: Dispatch) => ({
    async GetImageArr(parameter: parameterData): Promise<void> {
      const res = await getAllImageInfo(parameter);
      const levelData = new Array(res.image.length).fill(-1);
      dispatch.imageBrowser.updateImageBrowserState({
        imageArr: res.image,
        imageLevel: levelData,
        isShowOverlay: false,
      });
    },
  }),
};

export default imageBrowser;
