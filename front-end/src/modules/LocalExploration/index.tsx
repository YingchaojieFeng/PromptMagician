import { ReactNode, useEffect, useState, useRef, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Dispatch, RootState } from "../../store";
import { message } from "antd";
import { CopyOutlined, HeartOutlined, HeartFilled } from "@ant-design/icons";
import styles from "./index.module.scss";
import { highlightText } from "../../function/highlightText";
import * as d3 from "d3";
import { imageDetailInfo } from "../../models/localExploration";

const highlightTextStyle = {
  color: "#E17734",
  backgroundColor: "transparent",
};
type imageDetailState = {
  img: string;
  prompt: ReactNode;
  guidanceScale: number;
  randomSeed: number;
};

const guidanceWidth = 468;
const guidanceHeight = 170;

const keywordsWidth = 130;
const keywordsHeight = 550;
const imagesHeight = 550;

const LocalExploration = () => {
  const $guidanceChart = useRef<SVGSVGElement>(null);
  const $keywordsChart = useRef<SVGSVGElement>(null);
  const $imagesChart = useRef<SVGSVGElement>(null);
  const { allKeywords, selectedKeywords, imageDetailArr, guidanceInfoData } =
    useSelector((state: RootState) => {
      return state.localExploration;
    });
  const { promptData } = useSelector((state: RootState) => {
    return state.parameter;
  });
  const { updateLocalExplorationState } =
    useDispatch<Dispatch>().localExploration;
  const [selectedImageDetailArr, setSelectedImageDetailArr] = useState<
    imageDetailState[]
  >([]);
  const [unselectedImageDetailArr, setUnselectedImageDetailArr] = useState<
    imageDetailState[]
  >([]);
  const [filterKeywords, setFilterKeywords] = useState<string[]>([]);
  const [likedImage, setLikedImage] = useState<string[]>([]);
  const [sortImages, setSortImages] = useState<imageDetailInfo[]>([]);

  const [largeImageLeftPos, setLargeImageLeftPos] = useState<number>(0);
  const [largeImageSrc, setLargeImageSrc] = useState<string>(""); //base64
  const [largeImageShow, setLargeImageShow] = useState<boolean>(false);

  const addtoPrompt = () => {
    if (selectedKeywords.length > 0) {
      const currentKeywords = selectedKeywords.join(", ");
      if (navigator.clipboard) {
        navigator.clipboard.writeText(currentKeywords);
      } else {
        const textarea = document.createElement("textarea");
        document.body.appendChild(textarea);
        textarea.style.position = "fixed";
        textarea.style.top = "10px";
        textarea.value = currentKeywords;
        textarea.select();
        document.execCommand("copy", true);
        document.body.removeChild(textarea);
      }
      message.success("Copy selected keywords successed！");
    }
  };

  useEffect(() => {
    let resultDetailsArea = document.getElementById("resultDetailsArea");
    resultDetailsArea!.scrollTop = 0;

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

  useEffect(() => {
    let newFilterKeywords = allKeywords.filter(
      (item) => !promptData.toLowerCase().includes(item.toLowerCase())
    );
    setFilterKeywords(newFilterKeywords);
  }, [allKeywords, promptData]);

  //===============================Guidance Scale===============================
  const xScale = useMemo(() => {
    return d3.scaleLinear().domain([0, 50]).range([0, 390]);
  }, []);
  const yScale = useMemo(() => {
    const maxNum = Math.max(...guidanceInfoData.local);
    return d3.scaleLinear().domain([maxNum, 0]).range([0, 130]);
  }, [guidanceInfoData.local]);
  const xAxis = useMemo(() => {
    return d3.axisBottom(xScale).ticks(11).tickSize(6).tickPadding(5);
  }, [xScale]);
  const yAxis = useMemo(() => {
    return d3
      .axisLeft(yScale)
      .ticks(
        Math.max(...guidanceInfoData.local) > 5
          ? 5
          : Math.max(...guidanceInfoData.local)
      )
      .tickSize(6)
      .tickPadding(5);
  }, [yScale, guidanceInfoData]);
  useEffect(() => {
    let svg = d3.select($guidanceChart.current);
    svg.selectAll("*").remove();
    if (guidanceInfoData.local.length > 0) {
      svg
        .append("g")
        .attr("class", "x-axis")
        .attr("transform", "translate(50,145)")
        .attr("class", "x-axis")
        .call(xAxis);

      svg
        .append("g")
        .attr("class", "y-axis")
        .attr("transform", "translate(50,15)")
        .attr("class", "y-axis")
        .call(yAxis);

      svg
        .selectAll("currentImage")
        .data(guidanceInfoData.local)
        .enter()
        .append("rect")
        .attr("class", "currentImage")
        .attr("transform", `translate(-15, 0)`)
        .attr("x", (d, i) => {
          return 5 * xScale(i) + 70;
        })
        .attr("width", 30)
        .attr("height", (d, i) => {
          return 130 - yScale(guidanceInfoData.local[i]);
        })
        .attr("y", (d, i) => yScale(guidanceInfoData.local[i]) + 15)
        .attr("fill", "rgb(119,119,119)");
    }
  }, [guidanceInfoData.local, xAxis, xScale, yAxis, yScale]);

  //===============================Prompt Keywords===============================
  useEffect(() => {
    let newImagesArr = [...imageDetailArr];

    const selectedSortedWords = [];
    const unselectedSortedWords = [];
    for (let i = 0; i < filterKeywords.length; i++) {
      if (selectedKeywords.includes(filterKeywords[i])) {
        selectedSortedWords.push(filterKeywords[i]);
      } else {
        unselectedSortedWords.push(filterKeywords[i]);
      }
    }

    if (unselectedSortedWords.length > 0) {
      let weightMap = new Map();
      for (let i = 0; i < imageDetailArr.length; i++) {
        let tmpWeight = "";
        for (let j = 0; j < unselectedSortedWords.length; j++) {
          if (
            imageDetailArr[i].prompt
              .toLowerCase()
              .includes(unselectedSortedWords[j])
          )
            tmpWeight += "1";
          else tmpWeight += "0";
        }
        weightMap.set(imageDetailArr[i].img, tmpWeight);
      }
      newImagesArr.sort((a, b) => {
        const aWeight = weightMap.get(a.img);
        const bWeight = weightMap.get(b.img);
        for (let i = 0; i < aWeight.length; i++) {
          if (aWeight[i] !== bWeight[i]) {
            return bWeight[i] - aWeight[i];
          }
        }
        return 0;
      });
      weightMap.clear();
    }

    if (selectedSortedWords.length > 0) {
      let weightMap = new Map();
      for (let i = 0; i < imageDetailArr.length; i++) {
        let tmpWeight = "";
        for (let j = 0; j < selectedSortedWords.length; j++) {
          if (
            imageDetailArr[i].prompt
              .toLowerCase()
              .includes(selectedSortedWords[j])
          )
            tmpWeight += "1";
          else tmpWeight += "0";
        }
        weightMap.set(imageDetailArr[i].img, tmpWeight);
      }
      newImagesArr.sort((a, b) => {
        const aWeight = weightMap.get(a.img);
        const bWeight = weightMap.get(b.img);
        for (let i = 0; i < aWeight.length; i++) {
          if (aWeight[i] !== bWeight[i]) {
            return bWeight[i] - aWeight[i];
          }
        }
        return 0;
      });
      weightMap.clear();
    }

    setSortImages(newImagesArr);
  }, [filterKeywords, imageDetailArr, selectedKeywords]);

  useEffect(() => {
    let svg = d3.select($keywordsChart.current);
    svg.selectAll("*").remove();

    let imagesSvg = d3.select($imagesChart.current);
    imagesSvg.selectAll("*").remove();

    if (filterKeywords.length > 0) {
      svg
        .append("rect")
        .attr("x", 5)
        .attr("y", 10)
        .attr("width", 120)
        .attr("height", 40)
        .attr("fill", "white")
        .attr("stroke", "gray")
        .attr("rx", 5)
        .attr("ry", 5)
        .attr("class", "legendRect");
      svg
        .append("line")
        .attr("x1", 7)
        .attr("y1", 10)
        .attr("x2", 123)
        .attr("y2", 50)
        .attr("class", "legendLine")
        .attr("stroke", "rgb(200,200,200)")
        .attr("stroke-width", "2px");
      svg
        .append("text")
        .attr("x", 40)
        .attr("y", 42)
        .attr("fill", "gray")
        .attr("class", "legendWords")
        .style("font-size", "14px")
        .style("font-weight", "bolder")
        .style("cursor", "pointer")
        .attr("text-anchor", "middle")
        .text("Prompt");
      svg
        .append("text")
        .attr("x", 90)
        .attr("y", 25)
        .attr("fill", "gray")
        .attr("class", "legendWords")
        .style("font-size", "14px")
        .style("font-weight", "bolder")
        .style("cursor", "pointer")
        .attr("text-anchor", "middle")
        .text("Image");

      svg
        .selectAll("promptKeywordsRect")
        .data(filterKeywords)
        .enter()
        .append("rect")
        .attr("x", 5)
        .attr("y", (d, i) => {
          return i * 30 + 60;
        })
        .attr("width", 120)
        .attr("height", 22)
        .attr("fill", (d) =>
          selectedKeywords.includes(d) ? "rgb(73,73,73)" : "rgb(180,180,180)"
        )
        .attr("rx", 5)
        .attr("ry", 5)
        .attr("class", "promptKeywordsRect")
        .style("cursor", "pointer");

      svg
        .selectAll("promptKeywords")
        .data(filterKeywords)
        .enter()
        .append("text")
        .attr("x", 65)
        .attr("y", (d, i) => {
          return i * 30 + 75;
        })
        .attr("fill", "white")
        .attr("class", "promptKeywords")
        .style("font-size", "14px")
        .style("cursor", "pointer")
        .attr("text-anchor", "middle")
        .text((d) => {
          return d;
        })
        .on("click", (e) => {
          let newSelectedKeywords = [...selectedKeywords];
          if (!selectedKeywords.includes(e.target.__data__)) {
            newSelectedKeywords.push(e.target.__data__);
          } else {
            newSelectedKeywords = newSelectedKeywords.filter(
              (item) => item !== e.target.__data__
            );
          }
          updateLocalExplorationState({
            selectedKeywords: newSelectedKeywords,
          });
        });

      imagesSvg
        .selectAll("promptKeywordsLines")
        .data(filterKeywords)
        .enter()
        .append("line")
        .attr("x1", 0)
        .attr("y1", (d, i) => {
          return i * 30 + 70;
        })
        .attr("x2", sortImages.length * 45)
        .attr("y2", (d, i) => {
          return i * 30 + 70;
        })
        .attr("class", "promptKeywordsLines")
        .attr("stroke", "black")
        .attr("stroke-width", "1px");

      imagesSvg
        .selectAll("promptKeywordsImages")
        .data(sortImages)
        .enter()
        .append("image")
        .attr("href", (d) => "data:image/png;base64," + d.img)
        .attr("width", 40)
        .attr("height", 40)
        .attr("transform", (d, i) => {
          const x = i * 45;
          return `translate(` + x + `,10)`;
        })
        .attr("class", "promptKeywordsImages")
        .on("mouseover", (e) => {
          if (e.target.__data__?.img) {
            setLargeImageShow(true);
            setLargeImageSrc(e.target.__data__.img);
            setLargeImageLeftPos(e.layerX >= 410 ? e.layerX - 40 : e.layerX);
          }
        })
        .on("mouseout", (e) => {
          setLargeImageShow(false);
        });

      for (let k = 0; k < sortImages.length; k++) {
        const includeKeywordsId: number[] = [];
        for (let i = 0; i < filterKeywords.length; i++) {
          if (sortImages[k].prompt.toLowerCase().includes(filterKeywords[i])) {
            includeKeywordsId.push(i);
          }
        }
        imagesSvg
          .selectAll("promptKeywordsDots")
          .data(includeKeywordsId)
          .enter()
          .append("circle")
          .attr("r", 6)
          .attr("cx", 20 + k * 45)
          .attr("cy", (d, i) => {
            return d * 30 + 70;
          })
          .attr("class", "promptKeywordsDots");

        imagesSvg
          .append("line")
          .attr("x1", 20 + k * 45)
          .attr("y1", includeKeywordsId[0] * 30 + 70)
          .attr("x2", 20 + k * 45)
          .attr("y2", includeKeywordsId[includeKeywordsId.length - 1] * 30 + 70)
          .attr("class", "promptKeywordsDotsLines")
          .attr("stroke", "black")
          .attr("stroke-width", "1px");
      }
    }
  }, [
    filterKeywords,
    selectedKeywords,
    sortImages,
    updateLocalExplorationState,
  ]);
  return (
    <div className={styles["local-exploration-panel"]}>
      <div className={styles["title"]}>Local Exploration</div>
      <div className={styles["result-details"]}>
        <div className={styles["result-details-title"]}>Result Details</div>
        <div className={styles["result-details-area"]} id="resultDetailsArea">
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
                            <HeartFilled style={{ color: "#fb8282" }} />
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
      <div className={styles["related-keywords"]}>
        <div className={styles["related-keywords-title"]}>
          <div className={styles["related-keywords-title-text"]}>
            Prompt Keywords
          </div>
          <div
            className={styles["related-keywords-title-copy"]}
            onClick={() => {
              addtoPrompt();
            }}
          >
            <div className={styles["related-keywords-title-button"]}>
              <CopyOutlined />
            </div>
            <div className={styles["related-keywords-title-hint"]}>Copy</div>
          </div>
        </div>
        <div className={styles["related-keywords-area"]}>
          <div
            className={styles["related-keywords-largeImage"]}
            style={{
              top: -150,
              left: largeImageLeftPos - 90,
              display: largeImageShow ? "block" : "none",
              background: "rgba(220,220,220,0.75)",
              borderRadius: 5,
              height: 150,
            }}
          >
            <img
              src={"data:image/png;base64," + largeImageSrc}
              alt=""
              style={{
                width: "140px",
                padding: "5px",
              }}
            ></img>
          </div>
          <div className={styles["related-keywords-relation"]}>
            <div className={styles["related-keywords-relation-keywordsChart"]}>
              <svg
                style={{
                  width: keywordsWidth,
                  height: keywordsHeight,
                }}
                ref={$keywordsChart}
              ></svg>
            </div>
            <div className={styles["related-keywords-relation-imagesChart"]}>
              <svg
                style={{
                  width: sortImages.length * 45 + 20,
                  height: imagesHeight,
                }}
                ref={$imagesChart}
              ></svg>
            </div>
          </div>
        </div>
      </div>
      <div className={styles["guidance-scale"]}>
        <div className={styles["guidance-scale-title"]}>Guidance Scale</div>
        <div className={styles["guidance-scale-area"]}>
          <svg
            style={{ width: guidanceWidth, height: guidanceHeight }}
            ref={$guidanceChart}
          ></svg>
        </div>
      </div>
    </div>
  );
};
export default LocalExploration;
