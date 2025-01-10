import GenerateTerminalCommand from "./cmd";
import CommitMessageCommand from "./commit";
import DraftIssueCommand from "./draftIssue";
import HttpSlashCommand from "./http";
import HttpPromptSlashCommand from "./httpprompt";
import OnboardSlashCommand from "./onboard";
import ReviewMessageCommand from "./review";
import ShareSlashCommand from "./share";

export default [
  DraftIssueCommand,
  ShareSlashCommand,
  GenerateTerminalCommand,
  HttpSlashCommand,
  HttpPromptSlashCommand,
  CommitMessageCommand,
  ReviewMessageCommand,
  OnboardSlashCommand,
];
