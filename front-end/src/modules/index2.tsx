import ImageBrowser from "./ImageBrowser";
import styles from "./index.module.scss";
import ParameterConfigration from "./ParameterConfigration";
import LocalExploration2 from "./LocalExploration2";
import ImageSelection2 from "./ImageSelection2";

const MainInterface2 = () => {
  return (
    <div className={styles["page"]}>
      <div className={styles["header"]}>
        <div className={styles["main-header"]}>PROMPT MAGICIAN</div>
        <div className={styles["header-content"]}>
          Interactive Prompt Engineering for Text-to-image Generation
        </div>
      </div>
      <div className={styles["wrapper"]}>
        <div className={styles["left-column"]}>
          <div className={styles["left-top"]}>
            <ParameterConfigration />
          </div>
          <div className={styles["left-bottom"]}>
            <ImageSelection2 />
          </div>
        </div>
        <div className={styles["center-column"]}>
          <ImageBrowser />
        </div>
        <div className={styles["right-column"]}>
          <LocalExploration2 />
        </div>
      </div>
    </div>
  );
};
export default MainInterface2;
