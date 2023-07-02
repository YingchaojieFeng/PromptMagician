import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import styles from "./index.module.scss";
import * as d3 from "d3";
import { useDispatch, useSelector } from "react-redux";
import { Dispatch, RootState } from "../../store";
import { Checkbox } from "antd";
import type { CheckboxChangeEvent } from "antd/es/checkbox";
import { imageData } from "../../models/imageBrowser";
import { Spin } from "antd";
import { getImageDetail } from "../../services";

const width = 940;
const height = 940;
const DEFAULT = d3.zoomIdentity.translate(0, 0).scale(1);

function useDebounce(fn: any, delay: number, dep = []) {
  const { current } = useRef({ fn, timer: null });
  useEffect(
    function () {
      current.fn = fn;
    },
    [fn]
  );

  return useCallback(function f(...args: any[]) {
    if (current.timer) {
      clearTimeout(current.timer);
    }
    //@ts-ignore
    current.timer = setTimeout(() => {
      //@ts-ignore
      current.fn.call(this, ...args);
    }, delay);
  }, dep);
}

const ImageBrowser = () => {
  const $container = useRef<SVGSVGElement>(null);
  const $brushArea = useRef<SVGSVGElement>(null);
  const $images = useRef<SVGSVGElement>(null);
  const $legend = useRef<SVGSVGElement>(null);
  const { updateImageBrowserState } = useDispatch<Dispatch>().imageBrowser;
  const { updateImageSelectionState } = useDispatch<Dispatch>().imageSelection;
  const { GetImageDetailArr } = useDispatch<Dispatch>().localExploration;
  const { imageArr, textArr, selectedImage, imageLevel, isShowOverlay } =
    useSelector((state: RootState) => {
      return state.imageBrowser;
    });
  const { satisfiedImage } = useSelector((state: RootState) => {
    return state.imageSelection;
  });
  const [currentImageArr, setCurrentImageArr] = useState<imageData[]>([]);
  const [transform, setTransform] = useState<any>(DEFAULT);
  const [textShow, setTextShow] = useState<boolean>(true);
  const [imagetypeShow, setImagetypeShow] = useState<boolean>(true);
  const [brushedImage, setBrushedImage] = useState<string[]>([]);
  const [brushStatus, setBrushStatus] = useState<number>(0);

  const [showImageTooltip, setShowImageTooltip] = useState<boolean>(false);
  const [imageMessageReturned, setImageMessageReturned] =
    useState<boolean>(false);
  const [imageTooltipTopPosition, setImageTooltipTopPosition] =
    useState<number>(0);
  const [imageTooltipLeftPosition, setImageTooltipLeftPosition] =
    useState<number>(0);
  const [currentImagePrompt, setCurrentImagePrompt] = useState<string>("");
  const [currentImageGuidance, setCurrentImageGuidance] = useState<number>(0);
  const [currentImageRandom, setCurrentImageRandom] = useState<number>(0);
  const [currentImage, setcurrentImage] = useState<string>("");
  const [textRelatedImages, setTextRelatedImages] = useState<string[]>([]);

  const onTextCheckboxChange = (e: CheckboxChangeEvent) => {
    setTextShow(e.target.checked);
  };
  const onImagetypeCheckboxChange = (e: CheckboxChangeEvent) => {
    setImagetypeShow(e.target.checked);
  };

  //debounce
  const debounceOnChange = useDebounce((nodeid: string[]) => {
    getImageDetail(nodeid).then((res) => {
      setImageMessageReturned(true);
      setCurrentImageGuidance(res.imageDetail[0].guidanceScale);
      setcurrentImage(res.imageDetail[0].img);
      setCurrentImagePrompt(res.imageDetail[0].prompt);
      setCurrentImageRandom(res.imageDetail[0].randomSeed);
    });
  }, 500);

  const range = useMemo(() => {
    let minX = Number.MAX_VALUE;
    let minY = Number.MAX_VALUE;
    let minLevel = Number.MAX_VALUE;
    let maxX = Number.MIN_VALUE;
    let maxY = Number.MIN_VALUE;
    let maxLevel = Number.MIN_VALUE;

    imageArr.forEach((node) => {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      if (imageLevel[Number(node.id)] !== -1)
        minLevel = Math.min(minLevel, imageLevel[Number(node.id)]);
      maxX = Math.max(maxX, node.x);
      maxY = Math.max(maxY, node.y);
      if (imageLevel[Number(node.id)] !== -1)
        maxLevel = Math.max(maxLevel, imageLevel[Number(node.id)]);
    });

    return {
      x: [minX, maxX],
      y: [minY, maxY],
      level: [minLevel, maxLevel],
    };
  }, [imageArr, imageLevel]);

  const xScale = useMemo(() => {
    return transform.rescaleX(
      d3
        .scaleLinear()
        .domain(range.x)
        .range([25, width - 25])
        .nice()
    );
  }, [range.x, transform]);

  const yScale = useMemo(() => {
    return transform.rescaleY(
      d3
        .scaleLinear()
        .domain(range.y)
        .range([25, height - 25])
        .nice()
    );
  }, [range.y, transform]);

  const isBrushed = (
    brush_coords: [[number, number], [number, number]],
    cx: number,
    cy: number
  ) => {
    if (brush_coords === null) return false;
    var x0 = brush_coords[0][0],
      x1 = brush_coords[1][0],
      y0 = brush_coords[0][1],
      y1 = brush_coords[1][1];
    return x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;
  };
  const updateChart = (e: any) => {
    const selectedArr: Array<string> = [];
    if ($images.current) {
      const selectedImage = Array.from($images.current?.children);
      for (let item of selectedImage) {
        const translateX = Number(
          item
            .getAttribute("transform")
            ?.split("(")[1]
            .split(")")[0]
            .split(",")[0]
        );
        const translateY = Number(
          item
            .getAttribute("transform")
            ?.split("(")[1]
            .split(")")[0]
            .split(",")[1]
        );
        if (isBrushed(e.selection, translateX, translateY)) {
          selectedArr.push(item.id);
        }
      }
    }
    setBrushedImage(selectedArr);

    //@ts-ignore
    d3.select($brushArea.current).select(".brush").call(d3.brush().clear);
  };
  const brush = d3
    .brush()
    .extent([
      [0, 0],
      [width, height],
    ])
    .on("end", updateChart);

  const zoom = d3
    .zoom()
    .scaleExtent([1, 10])
    .translateExtent([
      [0, 0],
      [width, height],
    ])
    .on("zoom", (e) => {
      setTransform(e.transform);
    });

  useEffect(() => {
    let newImageLevel = [...imageArr];
    newImageLevel.sort((a, b) => {
      return imageLevel[Number(a.id)] - imageLevel[Number(b.id)];
    });
    setCurrentImageArr(newImageLevel);
  }, [imageArr, imageLevel]);

  useEffect(() => {
    const newSatisfiedImage: string[] = [];
    for (let item of imageArr) {
      newSatisfiedImage.push(item.id);
    }
    updateImageSelectionState({ satisfiedImage: newSatisfiedImage });
  }, [imageArr, updateImageSelectionState]);

  useEffect(() => {
    const newSelectedImage = brushedImage.filter((item) =>
      satisfiedImage.includes(item)
    );
    updateImageBrowserState({
      selectedImage: newSelectedImage,
    });
  }, [brushedImage, updateImageBrowserState]);

  useEffect(() => {
    if (selectedImage.length > 0) {
      GetImageDetailArr(selectedImage);
    }
  }, [GetImageDetailArr, selectedImage]);

  useEffect(() => {
    //@ts-ignore
    let svg = d3.select($container.current);
    //@ts-ignore
    svg.call(zoom).transition().duration();
    svg.on("keydown", (e) => {
      switch (e.key) {
        case " ":
          setBrushStatus(1);
          break;
        case "Escape":
          setBrushStatus(0);
          break;
      }
    });
  }, [brush, zoom]);
  useEffect(() => {
    let brushSvg = d3.select($brushArea.current);
    //@ts-ignore
    let svg = d3.select($container.current);
    if (brushStatus === 0) {
      //@ts-ignore
      brushSvg
        //@ts-ignore
        .call(zoom)
        .transition()
        .duration();
      d3.selectAll(".brush").on(".brush", null);
      d3.selectAll(".brush").remove();
      //@ts-ignore
      svg.call(zoom).transition().duration();
    } else if (brushStatus === 1) {
      svg.on(".zoom", null);
      //@ts-ignore
      let brushGroup = d3.selectAll(".brush");
      if (brushGroup.empty()) {
        brushSvg.append("g").attr("class", "brush").call(brush);
      }
      brushSvg
        //@ts-ignore
        .call(zoom)
        .on("mousedown.zoom", null)
        .transition()
        .duration();
    }
  }, [brush, brushStatus, zoom]);

  //legend
  useEffect(() => {
    let svg = d3.select($legend.current);
    svg.selectAll("*").remove();
    if (imagetypeShow) {
      const legend = svg.append("g").attr("class", "legend");
      legend
        .append("rect")
        .attr("x", "800")
        .attr("y", "10")
        .attr("width", "20")
        .attr("height", "20")
        .attr("fill", "white")
        .attr("opacity", "0.5")
        .attr("stroke", "red")
        .attr("stroke-width", "3px");

      legend
        .append("text")
        .attr("x", "825")
        .attr("y", "25")
        .style("font-size", "12px")
        .attr("fill", "black")
        .style("font-weight", "bold")
        .text("Selected Images");

      legend
        .append("rect")
        .attr("x", "800")
        .attr("y", "40")
        .attr("width", "20")
        .attr("height", "20")
        .attr("fill", "white")
        .attr("opacity", "0.5")
        .attr("stroke", "blue")
        .attr("stroke-width", "3px");

      legend
        .append("text")
        .attr("x", "825")
        .attr("y", "55")
        .style("font-size", "12px")
        .attr("fill", "black")
        .style("font-weight", "bold")
        .text("Generated Images");
      legend
        .append("rect")
        .attr("x", "800")
        .attr("y", "70")
        .attr("width", "20")
        .attr("height", "20")
        .attr("fill", "white")
        .attr("opacity", "0.5")
        .attr("stroke", "green")
        .attr("stroke-width", "3px");

      legend
        .append("text")
        .attr("x", "825")
        .attr("y", "85")
        .style("font-size", "12px")
        .attr("fill", "black")
        .style("font-weight", "bold")
        .text("Search Images");
    }
  }, [imagetypeShow]);

  return (
    <div className={styles["image-browser-panel"]}>
      <div className={styles["title"]}>
        <div className={styles["title-content"]}>Image Browser</div>
        <div className={styles["checkboxes"]}>
          <Checkbox onChange={onTextCheckboxChange} defaultChecked={true}>
            Show Prompt Keywords
          </Checkbox>
          <Checkbox onChange={onImagetypeCheckboxChange} defaultChecked={true}>
            Show Image Types
          </Checkbox>
        </div>
      </div>

      <div className={styles["image-browser-area"]}>
        <div
          className={styles["image-browser-overlay"]}
          style={{ display: isShowOverlay ? "block" : "none" }}
        >
          <Spin
            tip="loading..."
            size="large"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              color: "rgb(119, 119, 119)",
            }}
          />
        </div>
        <div
          className={styles["image-detail-info"]}
          style={{
            top: yScale(imageTooltipTopPosition) - 25 + "px",
            left: xScale(imageTooltipLeftPosition) + 25 + "px",
            display:
              showImageTooltip && imageMessageReturned ? "block" : "none",
          }}
        >
          <div className={styles["result-details-item"]}>
            <div className={styles["result-details-item-img"]}>
              <img
                src={"data:image/png;base64," + currentImage}
                alt=""
                style={{ width: "140px", height: "140px" }}
              ></img>
            </div>
            <div className={styles["result-details-item-description"]}>
              <div className={styles["result-details-item-prompt"]}>
                <div className={styles["result-details-item-prompt-title"]}>
                  <div
                    className={styles["result-details-item-prompt-title-text"]}
                  >
                    Prompt
                  </div>
                </div>
                <div className={styles["result-details-item-prompt-data"]}>
                  {currentImagePrompt}
                </div>
              </div>
              <div className={styles["result-details-item-parameters"]}>
                <div className={styles["result-details-item-parameters-item"]}>
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
                    {currentImageGuidance}
                  </div>
                </div>
                <div className={styles["result-details-item-parameters-item"]}>
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
                    {currentImageRandom}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <svg
          style={{
            width: width,
            height: height,
            opacity: isShowOverlay ? "0" : "100%",
            outline: "none",
          }}
          ref={$container}
          tabIndex={0}
        >
          <g className="legend-area" ref={$legend}></g>
          <g className="images" ref={$images}>
            {currentImageArr.map((node, index) => {
              return (
                <g
                  transform={`translate(${xScale(node.x)}, ${yScale(node.y)})`}
                  key={index}
                  id={node.id}
                  onMouseOver={() => {
                    setImageTooltipLeftPosition(node.x);
                    setImageTooltipTopPosition(node.y);
                    setCurrentImageGuidance(0);
                    setcurrentImage("");
                    setCurrentImagePrompt("");
                    setCurrentImageRandom(0);
                    setShowImageTooltip(true);
                    debounceOnChange([node.id]);
                  }}
                  onMouseOut={() => {
                    setShowImageTooltip(false);
                    setImageMessageReturned(false);
                    setCurrentImageGuidance(0);
                    setcurrentImage("");
                    setCurrentImagePrompt("");
                    setCurrentImageRandom(0);
                  }}
                >
                  <image
                    href={"data:image/png;base64," + node.img}
                    width={50}
                    height={50}
                    transform={`translate(-25,-25
                  )`}
                    style={{
                      visibility:
                        satisfiedImage.includes(node.id) &&
                        range.level[1] - imageLevel[Number(node.id)] <=
                          ((transform.k + 5) *
                            (range.level[1] - range.level[0])) /
                            9 +
                            range.level[0] +
                            10
                          ? "visible"
                          : "hidden",
                      filter:
                        satisfiedImage.includes(node.id) &&
                        selectedImage.includes(node.id)
                          ? "drop-shadow(0px 0px 2px red)"
                          : imagetypeShow && node.type === "generate"
                          ? "drop-shadow(0px 0px 2px blue)"
                          : imagetypeShow && node.type === "search"
                          ? "drop-shadow(0px 0px 2px green)"
                          : "unset",
                    }}
                  ></image>
                  <rect
                    width={50}
                    height={50}
                    transform={`translate(-25,-25
                    )`}
                    style={{
                      display: satisfiedImage.includes(node.id)
                        ? "block"
                        : "none",
                      fill:
                        satisfiedImage.includes(node.id) &&
                        selectedImage.includes(node.id)
                          ? "red"
                          : imagetypeShow && node.type === "generate"
                          ? "blue"
                          : imagetypeShow && node.type === "search"
                          ? "green"
                          : "gray",
                      fillOpacity:
                        satisfiedImage.includes(node.id) &&
                        range.level[1] - imageLevel[Number(node.id)] >
                          ((transform.k + 5) *
                            (range.level[1] - range.level[0])) /
                            9 +
                            range.level[0] +
                            10
                          ? 0.08
                          : 0,
                      strokeWidth: textRelatedImages.includes(node.id)
                        ? "5px"
                        : "0px",
                      stroke: "orange",
                    }}
                  ></rect>
                </g>
              );
            })}
            {textArr.map((node, index) => {
              return (
                <g
                  transform={`translate(${xScale(node.x)}, ${yScale(node.y)})`}
                  key={index}
                >
                  <rect
                    rx={5}
                    ry={5}
                    width={
                      document.getElementById("text_" + node.text)
                        ? document
                            .getElementById("text_" + node.text) //@ts-ignore
                            ?.getBBox().width + 10
                        : 10
                    }
                    height={
                      document.getElementById("text_" + node.text)
                        ? document
                            .getElementById("text_" + node.text) //@ts-ignore
                            ?.getBBox().height + 7
                        : 7
                    }
                    transform={`translate(-5,-18 
                      )`}
                    style={{
                      fill: "white",
                      visibility:
                        textShow &&
                        range.level[1] - node.level <=
                          ((transform.k + 5) *
                            (range.level[1] - range.level[0])) /
                            9 +
                            range.level[0] +
                            10
                          ? "visible"
                          : "hidden",
                      borderRadius: 10,
                      strokeWidth: 0.5,
                      stroke: "gray",
                      opacity: 0.6,
                    }}
                  ></rect>
                  <text
                    style={{
                      visibility:
                        textShow &&
                        range.level[1] - node.level <=
                          ((transform.k + 5) *
                            (range.level[1] - range.level[0])) /
                            9 +
                            range.level[0] +
                            10
                          ? "visible"
                          : "hidden",
                      fill: "black",
                    }}
                    onClick={() => {
                      setTextRelatedImages(node.related_images.split(","));
                    }}
                    id={"text_" + node.text}
                  >
                    {node.text}
                  </text>
                </g>
              );
            })}
          </g>
          <svg
            className="graph"
            style={{ width: width, height: height }}
            ref={$brushArea}
          ></svg>
        </svg>
      </div>
    </div>
  );
};

export default ImageBrowser;
