import { ModelConfig } from "@continuedev/config-yaml";

import { IDE, IdeSettings, LLMOptions } from "../..";
import { BaseLLM } from "../../llm";
import { LLMClasses } from "../../llm/llms";
import ContinueProxy from "../../llm/llms/stubs/ContinueProxy";
import { PlatformConfigMetadata } from "../profile/PlatformProfileLoader";

const AUTODETECT = "AUTODETECT";

const ALWAYS_LOCAL_PROVIDERS = [
  "ollama",
  "lmstudio",
  "llamafile",
  "llama.cpp",
  "msty",
];

function useContinueProxy(
  model: ModelConfig,
  platformConfigMetadata: PlatformConfigMetadata | undefined,
): boolean {
  return (
    !!platformConfigMetadata && !ALWAYS_LOCAL_PROVIDERS.includes(model.provider)
  );
}

function getModelClass(
  model: ModelConfig,
  platformConfigMetadata: PlatformConfigMetadata | undefined,
): (typeof LLMClasses)[number] | undefined {
  if (useContinueProxy(model, platformConfigMetadata)) {
    return ContinueProxy;
  }
  return LLMClasses.find((llm) => llm.providerName === model.provider);
}

function getContinueProxyModelName(
  ownerSlug: string,
  packageSlug: string,
  model: ModelConfig,
): string {
  return `${ownerSlug}/${packageSlug}/${model.provider}/${model.model}`;
}

async function modelConfigToBaseLLM(
  model: ModelConfig,
  uniqueId: string,
  ideSettings: IdeSettings,
  writeLog: (log: string) => Promise<void>,
  platformConfigMetadata: PlatformConfigMetadata | undefined,
): Promise<BaseLLM | undefined> {
  const cls = getModelClass(model, platformConfigMetadata);

  if (!cls) {
    return undefined;
  }

  const usingContinueProxy = useContinueProxy(model, platformConfigMetadata);
  const modelName = usingContinueProxy
    ? getContinueProxyModelName(
        platformConfigMetadata!.ownerSlug,
        platformConfigMetadata!.packageSlug,
        model,
      )
    : model.model;

  let options: LLMOptions = {
    ...model,
    completionOptions: {
      ...(model.defaultCompletionOptions ?? {}),
      model: model.model,
      maxTokens:
        model.defaultCompletionOptions?.maxTokens ??
        cls.defaultOptions?.completionOptions?.maxTokens,
    },
    writeLog,
    uniqueId,
    title: model.name,
    model: modelName,
  };

  const llm = new cls(options);
  return llm;
}

async function autodetectModels(
  llm: BaseLLM,
  model: ModelConfig,
  ide: IDE,
  uniqueId: string,
  ideSettings: IdeSettings,
  writeLog: (log: string) => Promise<void>,
  platformConfigMetadata: PlatformConfigMetadata | undefined,
): Promise<BaseLLM[]> {
  try {
    const modelNames = await llm.listModels();
    const detectedModels = await Promise.all(
      modelNames.map(async (modelName) => {
        // To ensure there are no infinite loops
        if (modelName === AUTODETECT) {
          return undefined;
        }

        return await modelConfigToBaseLLM(
          {
            ...model,
            model: modelName,
            name: `${llm.title} - ${modelName}`,
          },
          uniqueId,
          ideSettings,
          writeLog,
          platformConfigMetadata,
        );
      }),
    );
    return detectedModels.filter((x) => typeof x !== "undefined") as BaseLLM[];
  } catch (e) {
    console.warn("Error listing models: ", e);
    return [];
  }
}

export async function llmsFromModelConfig(
  model: ModelConfig,
  ide: IDE,
  uniqueId: string,
  ideSettings: IdeSettings,
  writeLog: (log: string) => Promise<void>,
  platformConfigMetadata: PlatformConfigMetadata | undefined,
): Promise<BaseLLM[]> {
  const baseLlm = await modelConfigToBaseLLM(
    model,
    uniqueId,
    ideSettings,
    writeLog,
    platformConfigMetadata,
  );
  if (!baseLlm) {
    return [];
  }

  if (model.model === AUTODETECT) {
    const models = await autodetectModels(
      baseLlm,
      model,
      ide,
      uniqueId,
      ideSettings,
      writeLog,
      platformConfigMetadata,
    );
    return models;
  } else {
    return [baseLlm];
  }
}
