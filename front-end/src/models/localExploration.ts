import { Dispatch } from "../store";
import { getImageDetail } from "../services";

export interface imageDetailInfo {
  img: string;
  prompt: string;
  guidanceScale: number;
  randomSeed: number;
}

export interface guidanceInfo {
  global: number[];
  local: number[];
}

type State = {
  imageDetailArr: Array<imageDetailInfo>;
  allKeywords: string[];
  selectedKeywords: string[];
  guidanceInfoData: guidanceInfo;
};

const initialState: State = {
  imageDetailArr: [],
  allKeywords: [],
  selectedKeywords: [],
  guidanceInfoData: {
    global: [],
    local: [],
  },
};

const localExploration = {
  state: initialState,

  reducers: {
    updateLocalExplorationState(state: State, payload: Partial<State>) {
      return {
        ...state,
        ...payload,
      };
    },
  },

  effects: (dispatch: Dispatch) => ({
    async GetImageDetailArr(parameter: string[]): Promise<void> {
      const res = await getImageDetail(parameter);

      dispatch.localExploration.updateLocalExplorationState({
        imageDetailArr: res.imageDetail,
        allKeywords: res.keywords,
        guidanceInfoData: res.guidanceInfoData,
        selectedKeywords: [],
      });
    },
  }),
};

export default localExploration;
