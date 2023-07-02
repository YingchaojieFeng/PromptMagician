import { ChangeEvent, useEffect, useState } from "react";
import styles from "./index.module.scss";
import { Input, Slider, Modal } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { Dispatch, RootState } from "../../store";

const { TextArea } = Input;

const ParameterConfigration = () => {
  const { negativePromptData, promptData, guidanceScaleData, randomSeedData } =
    useSelector((state: RootState) => {
      return state.parameter;
    });
  const { updateParameterState } = useDispatch<Dispatch>().parameter;
  const { updateImageBrowserState } = useDispatch<Dispatch>().imageBrowser;
  const [currentPrompt, setCurrentPrompt] = useState<string>("");
  const [currentNegativePrompt, setCurrentNegativePrompt] =
    useState<string>("");
  const [currentGuidanceScale, setCurrentGuidanceScale] = useState<
    [number, number]
  >([0, 0]);
  const [currentRandomSeed, setCurrentRandomSeed] = useState<number>(0);
  const { GetImageArr } = useDispatch<Dispatch>().imageBrowser;

  const generateClick = () => {
    if (currentPrompt === "") {
      error();
    } else {
      updateImageBrowserState({ isShowOverlay: true, selectedImage: [] });
      updateParameterState({
        promptData: currentPrompt,
        negativePromptData: currentNegativePrompt,
        guidanceScaleData: currentGuidanceScale,
        randomSeedData: currentRandomSeed,
      });
      GetImageArr({
        promptData: currentPrompt,
        negativePromptData: currentNegativePrompt,
        guidanceScaleData: currentGuidanceScale,
        randomSeedData: currentRandomSeed,
      });
    }
  };

  const error = () => {
    Modal.error({
      title: "Prompt is empty!",
      content: "Please input your prompt here.",
    });
  };

  useEffect(() => {
    setCurrentPrompt(promptData);
    setCurrentNegativePrompt(negativePromptData);
    setCurrentGuidanceScale(guidanceScaleData);
    setCurrentRandomSeed(randomSeedData);
  }, [promptData, guidanceScaleData, randomSeedData, negativePromptData]);

  const promptOnChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentPrompt(e.target.value);
  };
  const negativePromptOnChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentNegativePrompt(e.target.value);
  };
  const sliderOnChange = (value: [number, number]) => {
    setCurrentGuidanceScale(value);
  };
  const randomSeedOnChange = (e: ChangeEvent<HTMLInputElement>) => {
    setCurrentRandomSeed(Number(e.target.value));
  };

  return (
    <div className={styles["parameter-configration-panel"]}>
      <div className={styles["title"]}>Model Input</div>
      <div className={styles["prompt"]}>
        <div className={styles["prompt-title"]}>Prompt</div>
        <TextArea
          rows={3}
          onChange={promptOnChange}
          value={currentPrompt}
          placeholder="Prompt"
          className={styles["prompt-textarea"]}
        />
        <TextArea
          rows={1}
          onChange={negativePromptOnChange}
          value={currentNegativePrompt}
          placeholder="Negative prompt (optional)"
          className={styles["prompt-textarea"]}
        />
      </div>
      <div className={styles["guidance-scale"]}>
        <div className={styles["guidance-scale-title"]}>Guidance Scale</div>
        <Slider
          className={styles["guidance-scale-slider"]}
          range
          max={50}
          min={0}
          step={1}
          marks={{ 0: "0", 50: "50" }}
          value={currentGuidanceScale}
          onChange={sliderOnChange}
        />
        <div className={styles["guidance-scale-hint"]}>
          Current Value: {currentGuidanceScale[0]}~{currentGuidanceScale[1]}
        </div>
      </div>
      <div className={styles["random-seed"]}>
        <div className={styles["random-seed-title"]}>
          <div className={styles["random-seed-title-text"]}>
            Total Generation
          </div>
          <div className={styles["random-seed-title-hint"]}>
            (About: {Math.ceil(currentRandomSeed / 56) * 20 + 10}s)
          </div>
        </div>
        <div className={styles["random-seed-generation"]}>
          <Input value={currentRandomSeed} onChange={randomSeedOnChange} />
          <button
            className={styles["random-seed-button"]}
            onClick={generateClick}
          >
            Generate
          </button>
        </div>
      </div>
    </div>
  );
};
export default ParameterConfigration;
