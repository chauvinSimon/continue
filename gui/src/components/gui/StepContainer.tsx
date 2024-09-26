import {
  ArrowPathIcon,
  BarsArrowDownIcon,
  HandThumbDownIcon,
  HandThumbUpIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { ChatHistoryItem } from "core";
import { stripImages } from "core/llm/images";
import { useContext, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import styled from "styled-components";
import { defaultBorderRadius, vscBackground, vscInputBackground } from "..";
import { IdeMessengerContext } from "../../context/IdeMessenger";
import useUIConfig from "../../hooks/useUIConfig";
import { RootState } from "../../redux/store";
import { getFontSize } from "../../util";
import ButtonWithTooltip from "../ButtonWithTooltip";
import { CopyButton } from "../markdown/CopyButton";
import StyledMarkdownPreview from "../markdown/StyledMarkdownPreview";

interface StepContainerProps {
  item: ChatHistoryItem;
  onReverse: () => void;
  onUserInput: (input: string) => void;
  onRetry: () => void;
  onContinueGeneration: () => void;
  onDelete: () => void;
  open: boolean;
  isFirst: boolean;
  isLast: boolean;
  index: number;
  modelTitle?: string;
}

const ContentDiv = styled.div<{ isUserInput: boolean; fontSize?: number }>`
  padding: 4px 0px 8px 0px;
  background-color: ${(props) =>
    props.isUserInput ? vscInputBackground : vscBackground};
  font-size: ${(props) => props.fontSize || getFontSize()}px;
  // border-radius: ${defaultBorderRadius};
  overflow: hidden;
`;

function StepContainer(props: StepContainerProps) {
  const [isHovered, setIsHovered] = useState(false);
  const active = useSelector((store: RootState) => store.state.active);
  const history = useSelector((state: RootState) => state.state.history);
  const [truncatedEarly, setTruncatedEarly] = useState(false);
  const ideMessenger = useContext(IdeMessengerContext);
  const [feedback, setFeedback] = useState<boolean | undefined>(undefined);
  const sessionId = useSelector((store: RootState) => store.state.sessionId);

  const isUserInput = props.item.message.role === "user";
  const uiConfig = useUIConfig();
  useEffect(() => {
    if (!active) {
      const content = stripImages(props.item.message.content).trim();
      const endingPunctuation = [".", "?", "!", "```"];

      // If not ending in punctuation or emoji, we assume the response got truncated
      if (
        !(
          endingPunctuation.some((p) => content.endsWith(p)) ||
          /\p{Emoji}/u.test(content.slice(-2))
        )
      ) {
        setTruncatedEarly(true);
      } else {
        setTruncatedEarly(false);
      }
    }
  }, [props.item.message.content, active]);

  const sendFeedback = (feedback: boolean) => {
    setFeedback(feedback);
    if (props.item.promptLogs?.length) {
      for (const promptLog of props.item.promptLogs) {
        ideMessenger.post("devdata/log", {
          tableName: "chat",
          data: { ...promptLog, feedback, sessionId },
        });
      }
    }
  };

  return (
    <div
      onMouseEnter={() => {
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
      }}
    >
      <div className="relative">
        <ContentDiv
          hidden={!props.open}
          isUserInput={isUserInput}
          fontSize={getFontSize()}
        >
          {uiConfig?.displayRawMarkdown ? (
            <pre
              className="whitespace-pre-wrap break-words p-4 max-w-full overflow-x-auto"
              style={{ fontSize: getFontSize() - 2 }}
            >
              {stripImages(props.item.message.content)}
            </pre>
          ) : (
            <StyledMarkdownPreview
              source={stripImages(props.item.message.content)}
              showCodeBorder={true}
            />
          )}
        </ContentDiv>

        {(props.isLast || isHovered || typeof feedback !== "undefined") &&
          !active && (
            <div className="flex items-center gap-1 absolute -bottom-2 right-2 hidden xs:flex text-xs text-gray-400">
              {props.modelTitle && (
                <div className="hidden sm:flex">
                  <div className="flex items-center truncate max-w-[40vw]">
                    {props.modelTitle}
                  </div>
                  <div className="ml-2 mr-1 w-px h-5 bg-gray-400" />
                </div>
              )}

              {truncatedEarly && (
                <ButtonWithTooltip
                  tabIndex={-1}
                  text="Continue generation"
                  onClick={props.onContinueGeneration}
                >
                  <BarsArrowDownIcon className="h-4 w-4" />
                </ButtonWithTooltip>
              )}

              <CopyButton
                tabIndex={-1}
                text={stripImages(props.item.message.content)}
              />

              <ButtonWithTooltip
                tabIndex={-1}
                text="Regenerate"
                onClick={props.onRetry}
              >
                <ArrowPathIcon className="h-4 w-4" />
              </ButtonWithTooltip>
              {feedback === false || (
                <ButtonWithTooltip text="Helpful" tabIndex={-1}>
                  <HandThumbUpIcon
                    className="h-4 w-4"
                    onClick={() => {
                      sendFeedback(true);
                    }}
                  />
                </ButtonWithTooltip>
              )}
              {feedback === true || (
                <ButtonWithTooltip text="Unhelpful" tabIndex={-1}>
                  <HandThumbDownIcon
                    className="h-4 w-4"
                    onClick={() => {
                      sendFeedback(false);
                    }}
                  />
                </ButtonWithTooltip>
              )}

              {props.index !== 1 && (
                <ButtonWithTooltip text="Delete" tabIndex={-1}>
                  <TrashIcon className="h-4 w-4" onClick={props.onDelete} />
                </ButtonWithTooltip>
              )}
            </div>
          )}
      </div>
    </div>
  );
}

export default StepContainer;
