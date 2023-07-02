import { Dispatch } from "../store";

export interface parameterData {
  promptData: string;
  negativePromptData: string;
  guidanceScaleData: [number, number];
  randomSeedData: number;
}

const initialState: parameterData = {
  promptData: "",
  negativePromptData: "",
  guidanceScaleData: [0, 50],
  randomSeedData: 0,
};

const parameter = {
  state: initialState,

  reducers: {
    updateParameterState(
      state: parameterData,
      payload: Partial<parameterData>
    ) {
      return {
        ...state,
        ...payload,
      };
    },
  },

  effects: (dispatch: Dispatch) => ({}),
};

export default parameter;
