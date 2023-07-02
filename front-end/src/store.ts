import { init, RematchDispatch, RematchRootState } from "@rematch/core";
import * as models from "./models";

export const store = init({
  models,
});

export type Store = typeof store;
export type RootModel = typeof models;
export type Dispatch = RematchDispatch<RootModel>;
export type RootState = RematchRootState<RootModel>;
