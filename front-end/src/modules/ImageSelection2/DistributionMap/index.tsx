import React, { useEffect, useState, useRef, useMemo } from "react";
import styles from "./index.module.scss";
import { Input } from "antd";
import * as d3 from "d3";
import { selection } from "d3";
import {
  getImageGrade,
  idGradeData,
  imageClustingData,
} from "../../../services";

const width = 370;
const height = 160;
const marginX = 40;
const marginY = 10;
const chartWidth = 300;
const chartHeight = 120;

const DistributionMap = (props: any) => {
  const id = props.id;
  const getEachSatisfiedImage = props.getEachSatisfiedImage;
  const $lineGraphcontainer = useRef<SVGSVGElement>(null);
  const [gradeArea, setGradeArea] = useState<[number, number]>([0, 1]);
  const [imageGradeData, setImageGradeData] = useState<idGradeData[]>([]);
  const [word1, setWord1] = useState<string>("");
  const [word2, setWord2] = useState<string>("");
  const [points, setPoints] = useState<imageClustingData[]>([]);
  const [satisfiedImageOfCurrent, setSatisfiedImageOfCurrent] = useState<
    string[]
  >([]);

  const xScale = useMemo(() => {
    return d3.scaleLinear().domain([0, 1]).range([0, chartWidth]);
  }, []);

  const reverseXScale = useMemo(() => {
    return d3
      .scaleLinear()
      .domain([marginX, chartWidth + marginX])
      .range([0, 1]);
  }, []);
  const yScale = useMemo(() => {
    let maxNum = 0;
    for (let i = 0; i < points.length; i++) {
      if (points[i].imageNum > maxNum) maxNum = points[i].imageNum;
    }
    return d3.scaleLinear().domain([maxNum, 0]).range([0, chartHeight]);
  }, [points]);
  const xAxis = useMemo(() => {
    return d3.axisBottom(xScale).ticks(11).tickSize(6).tickPadding(5);
  }, [xScale]);
  const yAxis = useMemo(() => {
    return d3.axisLeft(yScale).ticks(5).tickSize(6).tickPadding(5);
  }, [yScale]);

  const updateChart = useMemo(() => {
    return (e: any) => {
      if (e.selection === null) {
        setGradeArea([0, 1]);
      } else {
        setGradeArea([
          reverseXScale(e.selection[0]),
          reverseXScale(e.selection[1]),
        ]);
      }
    };
  }, [reverseXScale]);
  const brush = useMemo(() => {
    return d3
      .brushX()
      .extent([
        [xScale(0) + marginX, yScale(500) + marginY],
        [xScale(1) + marginX, yScale(0) + marginY],
      ])
      .on("end", updateChart);
  }, [updateChart, xScale, yScale]);

  useEffect(() => {
    let svg = d3.select($lineGraphcontainer.current);
    svg.selectAll("*").remove();
    if (points.length > 0) {
      var Gen = d3
        .line()
        .x((p: any) => xScale(p.grade) + marginX)
        .y((p: any) => yScale(p.imageNum) + marginY)
        .curve(d3.curveCardinal);
      svg
        .append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(${marginX},${marginY + chartHeight})`)
        .attr("class", "x-axis")
        .call(xAxis);

      svg
        .append("g")
        .attr("class", "y-axis")
        .attr("transform", `translate(${marginX},${marginY})`)
        .attr("class", "y-axis")
        .call(yAxis);

      svg
        .append("path")
        .attr("class", "mypath")
        .attr("fill", "#fff")
        .attr("opacity", ".8")
        .attr("stroke", "#000")
        .attr("stroke-width", 1)
        .attr("stroke-linejoin", "round")
        .attr(
          "d",
          //@ts-ignore
          Gen(points)
        )
        .attr("x", "50")
        .attr("y", "10");

      svg.append("g").attr("class", "lineGraphBrush").call(brush);
    }
  }, [xScale, yScale, xAxis, yAxis, brush, points]);

  useEffect(() => {
    const newSatisfiedImage: string[] = [];
    if (imageGradeData.length > 0) {
      for (let item of imageGradeData) {
        if (item.grade >= gradeArea[0] && item.grade <= gradeArea[1]) {
          newSatisfiedImage.push(item.id.toString());
        }
      }
      setSatisfiedImageOfCurrent(newSatisfiedImage);
    }
  }, [gradeArea, imageGradeData]);

  useEffect(() => {
    getEachSatisfiedImage(id, [...satisfiedImageOfCurrent]);
  }, [id, getEachSatisfiedImage, satisfiedImageOfCurrent]);

  return (
    <div className={styles["distribution-map-content"]}>
      <div className={styles["topline"]}>
        <div className={styles["text-prompt"]}>
          Evaluate the images as
          <Input
            className={styles["word-input"]}
            value={word1}
            onChange={(
              e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
            ) => {
              setWord1(e.target.value);
            }}
          />
          /
          <Input
            className={styles["word-input"]}
            value={word2}
            onChange={(
              e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
            ) => {
              setWord2(e.target.value);
            }}
          />{" "}
        </div>
        <button
          className={styles["get-ImageData-button"]}
          onClick={() => {
            getImageGrade([word1, word2]).then((data) => {
              setPoints(data.imageClustingArr);
              setImageGradeData(data.idGradeArr);
            });
          }}
        >
          Get
        </button>
      </div>
      <svg
        style={{ width: width, height: height }}
        ref={$lineGraphcontainer}
      ></svg>
    </div>
  );
};

export default DistributionMap;
