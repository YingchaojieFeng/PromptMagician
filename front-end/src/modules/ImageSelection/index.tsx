import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Dispatch, RootState } from "../../store";
import styles from "./index.module.scss";
import DistributionMap from "./DistributionMap";
import { cloneDeep } from "lodash";
import { getSatisfiedImageLevel } from "../../services";

const ImageSelection = () => {
  const { updateImageSelectionState } = useDispatch<Dispatch>().imageSelection;
  const { updateImageBrowserState } = useDispatch<Dispatch>().imageBrowser;
  const { satisfiedImage } = useSelector((state: RootState) => {
    return state.imageSelection;
  });
  const [totalItem, setTotalItem] = useState<number[]>([1]);
  const [totalSatisfiedImage, setTotalSatisfiedImage] = useState<string[]>([]);
  const getEachSatisfiedImage = (id: number, imgs: string[]) => {
    const currentTotalSatisfiedImage = cloneDeep(totalSatisfiedImage);
    currentTotalSatisfiedImage[id] = imgs.join(",");
    if (
      JSON.stringify(currentTotalSatisfiedImage) !==
      JSON.stringify(totalSatisfiedImage)
    ) {
      setTotalSatisfiedImage(currentTotalSatisfiedImage);
    }
  };
  useEffect(() => {
    let newSatisfiedImages: string[] = [];
    for (let item of totalSatisfiedImage) {
      if (item !== undefined && item.length > 0) {
        const currentSatisfiedImage = item.split(",");
        if (newSatisfiedImages.length === 0) {
          newSatisfiedImages = [...currentSatisfiedImage];
        } else {
          newSatisfiedImages = newSatisfiedImages.filter((img) =>
            currentSatisfiedImage.includes(img)
          );
        }
      }
    }
    if (
      newSatisfiedImages.length > 0 &&
      JSON.stringify(newSatisfiedImages) !== JSON.stringify(satisfiedImage)
    ) {
      updateImageSelectionState({ satisfiedImage: newSatisfiedImages });
    }
  }, [totalSatisfiedImage, updateImageSelectionState]);

  useEffect(() => {
    if (satisfiedImage.length > 0) {
      getSatisfiedImageLevel(satisfiedImage).then((data) => {
        let newTextArr = [...data.textDataArr];
        newTextArr.sort((a, b) => a.level - b.level);
        updateImageBrowserState({
          imageLevel: data.imageLevelData,
          textArr: newTextArr,
        });
      });
    }
  }, [satisfiedImage, updateImageBrowserState]);

  return (
    <div className={styles["image-selection-panel"]}>
      <div className={styles["title"]}>
        Image Evaluation
        <button
          className={styles["add-item"]}
          onClick={() => {
            setTotalItem([...totalItem, totalItem.length + 1]);
          }}
        >
          +
        </button>
      </div>
      <div className={styles["words-examples"]}>
        Examples:
        <div className={styles["words-examples-pairs"]}>warm / cold </div>
        <div className={styles["words-examples-pairs"]}>real / abstract </div>
        <div className={styles["words-examples-pairs"]}>cat / dog </div>
      </div>

      <div className={styles["image-distribution"]}>
        {totalItem.map((item, id) => {
          return (
            <DistributionMap
              id={item}
              key={id}
              getEachSatisfiedImage={getEachSatisfiedImage}
            />
          );
        })}
      </div>
    </div>
  );
};

export default ImageSelection;
