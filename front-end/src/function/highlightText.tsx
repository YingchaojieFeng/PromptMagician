import React from "react";
import { CSSProperties, ReactNode } from "react";

const regAtom = "^\\$.\\*+-?=!:|\\/()[]{}";

export const highlightText = (
  text: string,
  keywords: string | string[],
  highlightStyle?: CSSProperties,
  ignoreCase?: boolean
): string | [] | ReactNode => {
  let keywordRegExpArr = [];
  if (!text) {
    return "";
  }

  if (keywords) {
    if (keywords instanceof Array) {
      if (keywords.length === 0) {
        return text;
      }
      for (let keyword of keywords) {
        keywordRegExpArr.push(new RegExp(keyword, ignoreCase ? "ig" : "g"));
      }
    } else if (typeof keywords === "string") {
      keywordRegExpArr.push(new RegExp(keywords, ignoreCase ? "ig" : "g"));
    }
  }
  if (text && keywordRegExpArr.length > 0) {
    const keywordRegExp = new RegExp(
      (keywords as string[])
        .filter((item) => !!item)
        .map((item) => (regAtom.includes(item) ? "\\" + item : item))
        .join("|"),
      ignoreCase ? "ig" : "g"
    );
    const newData = text.split(keywordRegExp);
    // eslint-disable-next-line
    const matchWords = text.match(keywordRegExp);
    const len = newData.length;
    if (matchWords === null) return text;

    return (
      <>
        {newData.map((item, index) => (
          // eslint-disable-next-line react/no-array-index-key
          <React.Fragment key={index}>
            {item}
            {index !== len - 1 && (
              <mark style={highlightStyle}>{matchWords?.[index]}</mark>
            )}
          </React.Fragment>
        ))}
      </>
    );
  }
  return text;
};
