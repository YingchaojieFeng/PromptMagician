import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Dispatch, RootState } from "../../store";
import styles from "./index.module.scss";
import { getSatisfiedImageLevel } from "../../services";

const ImageSelection2 = () => {
  const { updateImageSelectionState } = useDispatch<Dispatch>().imageSelection;
  const { updateImageBrowserState } = useDispatch<Dispatch>().imageBrowser;
  const { satisfiedImage } = useSelector((state: RootState) => {
    return state.imageSelection;
  });
  const [totalSatisfiedImage, setTotalSatisfiedImage] = useState<string[]>([]);
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

  return <div className={styles["image-selection-panel"]}></div>;
};

export default ImageSelection2;
