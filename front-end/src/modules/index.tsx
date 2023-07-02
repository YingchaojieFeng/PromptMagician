import React from "react";
import ImageBrowser from "./ImageBrowser";
import ImageSelection from "./ImageSelection";
import styles from "./index.module.scss";
import ParameterConfigration from "./ParameterConfigration";
import { UserOutlined } from "@ant-design/icons";
import LocalExploration from "./LocalExploration";

const MainInterface = () => {
  return (
    <div className={styles["page"]}>
      <div className={styles["header"]}>
        <div className={styles["main-header"]}>PROMPT MAGICIAN</div>
        <div className={styles["header-content"]}>
          <div className={styles["header-content-text"]}>
            Interactive Prompt Engineering for Text-to-image Generation
          </div>

          <div className={styles["header-divider"]}></div>
          <div className={styles["header-content-icon"]}>
            <UserOutlined />
          </div>
        </div>
      </div>
      <div className={styles["wrapper"]}>
        <div className={styles["left-column"]}>
          <div className={styles["left-top"]}>
            <ParameterConfigration />
          </div>
          <div className={styles["left-bottom"]}>
            <ImageSelection />
          </div>
        </div>
        <div className={styles["center-column"]}>
          <ImageBrowser />
        </div>
        <div className={styles["right-column"]}>
          <LocalExploration />
        </div>
      </div>
    </div>
  );
};
export default MainInterface;
