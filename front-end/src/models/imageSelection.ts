import { Dispatch } from "../store";

type State = {
  wordsData: Array<string>;
  satisfiedImage: Array<string>;
};

const initialState: State = {
  wordsData: ["Dog", "Cat", "Tree"],
  satisfiedImage: [],
};

const imageSelection = {
  state: initialState,

  reducers: {
    updateImageSelectionState(state: State, payload: Partial<State>) {
      return {
        ...state,
        ...payload,
      };
    },
  },

  effects: (dispatch: Dispatch) => ({}),
};

export default imageSelection;
