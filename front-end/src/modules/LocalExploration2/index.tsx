import { ReactNode, useEffect, useState, useRef, useMemo } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { HeartOutlined, HeartFilled } from "@ant-design/icons";
import styles from "./index.module.scss";
import { highlightText } from "../../function/highlightText";
import * as d3 from "d3";

const highlightTextStyle = {
  color: "red",
  backgroundColor: "transparent",
};
type imageDetailState = {
  img: string;
  prompt: ReactNode;
  guidanceScale: number;
  randomSeed: number;
};

const LocalExploration2 = () => {
  const { selectedKeywords, imageDetailArr } = useSelector(
    (state: RootState) => {
      return state.localExploration;
    }
  );

  const [selectedImageDetailArr, setSelectedImageDetailArr] = useState<
    imageDetailState[]
  >([]);
  const [unselectedImageDetailArr, setUnselectedImageDetailArr] = useState<
    imageDetailState[]
  >([]);

  const [likedImage, setLikedImage] = useState<string[]>([]);

  useEffect(() => {
    if (selectedKeywords.length === 0) {
      setSelectedImageDetailArr(imageDetailArr);
      setUnselectedImageDetailArr([]);
    } else {
      const newSelectedKeywords: imageDetailState[] = [];
      const newUnselectedKeywords: imageDetailState[] = [];
      for (let item of imageDetailArr) {
        let newPrompt = highlightText(
          item.prompt,
          selectedKeywords,
          highlightTextStyle,
          true
        );
        const newItem = {
          img: item.img,
          prompt: newPrompt,
          guidanceScale: item.guidanceScale,
          randomSeed: item.randomSeed,
        };
        if (typeof newPrompt === "object") {
          newSelectedKeywords.push(newItem);
        } else {
          newUnselectedKeywords.push(newItem);
        }
      }
      setSelectedImageDetailArr(newSelectedKeywords);
      setUnselectedImageDetailArr(newUnselectedKeywords);
    }
  }, [imageDetailArr, selectedKeywords]);

  return (
    <div className={styles["local-exploration-panel"]}>
      <div className={styles["title"]}>Local Exploration</div>
      <div className={styles["result-details"]}>
        <div className={styles["result-details-title"]}>Result Details</div>
        <div className={styles["result-details-area"]}>
          {selectedImageDetailArr.map((item, index) => {
            return (
              <div key={index}>
                <div className={styles["result-details-item"]}>
                  <div className={styles["result-details-item-img"]}>
                    <img
                      src={"data:image/png;base64," + item.img}
                      alt=""
                      style={{ width: "140px", height: "140px" }}
                    ></img>
                  </div>
                  <div className={styles["result-details-item-description"]}>
                    <div className={styles["result-details-item-prompt"]}>
                      <div
                        className={styles["result-details-item-prompt-title"]}
                      >
                        <div
                          className={
                            styles["result-details-item-prompt-title-text"]
                          }
                        >
                          Prompt
                        </div>
                        <div
                          className={
                            styles["result-details-item-prompt-title-like"]
                          }
                          onClick={() => {
                            let newLikedImage: string[] = [];
                            if (likedImage.includes(item.img)) {
                              newLikedImage = likedImage.filter(
                                (current) => current !== item.img
                              );
                            } else {
                              newLikedImage = [...likedImage, item.img];
                            }
                            setLikedImage(newLikedImage);
                          }}
                        >
                          {likedImage.includes(item.img) ? (
                            <HeartFilled />
                          ) : (
                            <HeartOutlined />
                          )}
                        </div>
                      </div>
                      <div
                        className={styles["result-details-item-prompt-data"]}
                      >
                        {item.prompt}
                      </div>
                    </div>
                    <div className={styles["result-details-item-parameters"]}>
                      <div
                        className={
                          styles["result-details-item-parameters-item"]
                        }
                      >
                        <div
                          className={
                            styles["result-details-item-parameters-item-title"]
                          }
                        >
                          Guidance Scale
                        </div>
                        <div
                          className={
                            styles["result-details-item-parameters-item-data"]
                          }
                        >
                          {item.guidanceScale}
                        </div>
                      </div>
                      <div
                        className={
                          styles["result-details-item-parameters-item"]
                        }
                      >
                        <div
                          className={
                            styles["result-details-item-parameters-item-title"]
                          }
                        >
                          Random Seed
                        </div>
                        <div
                          className={
                            styles["result-details-item-parameters-item-data"]
                          }
                        >
                          {item.randomSeed}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {unselectedImageDetailArr.map((item, index) => {
            return (
              <div key={index}>
                <div
                  className={styles["result-details-item"]}
                  style={{ opacity: "0.3" }}
                >
                  <div className={styles["result-details-item-img"]}>
                    <img
                      src={"data:image/png;base64," + item.img}
                      alt=""
                      style={{ width: "140px", height: "140px" }}
                    ></img>
                  </div>
                  <div className={styles["result-details-item-description"]}>
                    <div className={styles["result-details-item-prompt"]}>
                      <div
                        className={styles["result-details-item-prompt-title"]}
                      >
                        <div
                          className={
                            styles["result-details-item-prompt-title-text"]
                          }
                        >
                          Prompt
                        </div>
                        <div
                          className={
                            styles["result-details-item-prompt-title-like"]
                          }
                          onClick={() => {
                            let newLikedImage: string[] = [];
                            if (likedImage.includes(item.img)) {
                              newLikedImage = likedImage.filter(
                                (current) => current !== item.img
                              );
                            } else {
                              newLikedImage = [...likedImage, item.img];
                            }
                            setLikedImage(newLikedImage);
                          }}
                        >
                          {likedImage.includes(item.img) ? (
                            <HeartFilled />
                          ) : (
                            <HeartOutlined />
                          )}
                        </div>
                      </div>
                      <div
                        className={styles["result-details-item-prompt-data"]}
                      >
                        {item.prompt}
                      </div>
                    </div>
                    <div className={styles["result-details-item-parameters"]}>
                      <div
                        className={
                          styles["result-details-item-parameters-item"]
                        }
                      >
                        <div
                          className={
                            styles["result-details-item-parameters-item-title"]
                          }
                        >
                          Guidance Scale
                        </div>
                        <div
                          className={
                            styles["result-details-item-parameters-item-data"]
                          }
                        >
                          {item.guidanceScale}
                        </div>
                      </div>
                      <div
                        className={
                          styles["result-details-item-parameters-item"]
                        }
                      >
                        <div
                          className={
                            styles["result-details-item-parameters-item-title"]
                          }
                        >
                          Random Seed
                        </div>
                        <div
                          className={
                            styles["result-details-item-parameters-item-data"]
                          }
                        >
                          {item.randomSeed}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
export default LocalExploration2;
