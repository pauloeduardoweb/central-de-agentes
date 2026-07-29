import { Agent, ChatMessage } from '../types';
import { AgentConfig, AgentSession, AgentImage } from '../agents/agentTypes';
import { AgentTemplateCompiler } from '../agents/AgentTemplateCompiler';
import { AgentResponseValidator } from './AgentResponseValidator';
import { AgentOutputGenerator, FinalOutputBlock } from './AgentOutputGenerator';
import { ProductContext } from './vision/visionTypes';

export interface ProcessResult {
  assistantMessages: ChatMessage[];
  updatedSession: AgentSession;
  finalOutputs?: FinalOutputBlock[];
  isCompleted: boolean;
}

export class AgentFlowRunner {
  static initializeSession(agent: Agent): { initialMessages: ChatMessage[]; session: AgentSession; config: AgentConfig } {
    const config = AgentTemplateCompiler.compile(agent);
    const firstStep = config.steps[0];

    const session: AgentSession = {
      agentId: agent.id,
      currentStepId: firstStep ? firstStep.id : 'completed',
      completedStepIds: [],
      answers: {},
      attachedImages: [],
      status: 'started',
      lastUpdated: new Date().toISOString()
    };

    const initialMsg: ChatMessage = {
      id: `msg-init-${Date.now()}`,
      role: 'assistant',
      content: config.initialMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    return {
      initialMessages: [initialMsg],
      session,
      config
    };
  }

  static async processInput(
    agent: Agent,
    textInput: string,
    imageInput: AgentImage | null,
    session: AgentSession
  ): Promise<ProcessResult> {
    const config = AgentTemplateCompiler.compile(agent);

    // If session is already completed, handle restart or edit
    if (session.status === 'completed') {
      const restartMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: 'O projeto já foi concluído! Para alterar informações, clique em **Editar Respostas** ou **Nova Conversa**.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      return {
        assistantMessages: [restartMsg],
        updatedSession: session,
        isCompleted: true
      };
    }

    const currentStep = config.steps.find((s) => s.id === session.currentStepId);

    if (!currentStep) {
      // Emergency fallback if step not found
      session.status = 'completed';
      const outputs = AgentOutputGenerator.generateOutputs(config, session);
      return {
        assistantMessages: [{
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: '✅ **Projeto Finalizado!** Confira o roteiro gerado abaixo:',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }],
        updatedSession: session,
        finalOutputs: outputs,
        isCompleted: true
      };
    }

    // Validate current step input (runs local vision analysis for photo / text)
    const validation = await AgentResponseValidator.validate(currentStep, textInput, imageInput);

    if (!validation.isValid) {
      const errorMsg: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Atenção:** ${validation.errorMessage}\n\n${currentStep.question}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      return {
        assistantMessages: [errorMsg],
        updatedSession: session,
        isCompleted: false
      };
    }

    // Save step answer
    const savedValue = validation.sanitizedValue || textInput;
    const nextAnswers = { ...session.answers, [currentStep.id]: savedValue };

    if (validation.productContext) {
      (session as any).productContext = validation.productContext;
      nextAnswers['productName'] = validation.productContext.productName;
    }

    if (imageInput) {
      session.attachedImages.push(imageInput);
    }

    const nextCompletedStepIds = Array.from(new Set([...session.completedStepIds, currentStep.id]));

    // Determine next step
    let nextStepId: string | undefined = undefined;

    if (validation.matchedOption?.nextStepId) {
      nextStepId = validation.matchedOption.nextStepId;
    } else if (currentStep.nextStepId) {
      nextStepId = currentStep.nextStepId;
    } else {
      const currentIndex = config.steps.findIndex((s) => s.id === currentStep.id);
      if (currentIndex >= 0 && currentIndex < config.steps.length - 1) {
        nextStepId = config.steps[currentIndex + 1].id;
      }
    }

    const messages: ChatMessage[] = [];

    // Step Confirmation Message
    const confirmText = currentStep.confirmationMessage || `Etapa ${currentStep.order} confirmada.`;
    const noticeText = validation.imageNotice ? `\n\n📷 *${validation.imageNotice}*` : '';

    if (!nextStepId || nextStepId === 'completed') {
      // Complete flow
      const updatedSession: AgentSession = {
        ...session,
        currentStepId: 'completed',
        completedStepIds: nextCompletedStepIds,
        answers: nextAnswers,
        status: 'completed',
        lastUpdated: new Date().toISOString()
      };

      const finalOutputs = AgentOutputGenerator.generateOutputs(config, updatedSession);

      const completionMsg: ChatMessage = {
        id: `msg-done-${Date.now()}`,
        role: 'assistant',
        content: `✅ **${confirmText}**${noticeText}\n\n🎉 **Todas as etapas foram concluídas com sucesso!**\n\nSeu roteiro e prompts foram gerados no formato de alta conversão abaixo:`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      if (finalOutputs[0]) {
        messages.push(completionMsg);
        messages.push({
          id: `msg-out-${Date.now()}`,
          role: 'assistant',
          content: finalOutputs[0].content,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }

      return {
        assistantMessages: messages,
        updatedSession,
        finalOutputs,
        isCompleted: true
      };
    }

    // Move to Next Step
    const nextStep = config.steps.find((s) => s.id === nextStepId);

    const updatedSession: AgentSession = {
      ...session,
      currentStepId: nextStepId,
      completedStepIds: nextCompletedStepIds,
      answers: nextAnswers,
      status: 'in-progress',
      lastUpdated: new Date().toISOString()
    };

    const nextStepMsg: ChatMessage = {
      id: `msg-step-${Date.now()}`,
      role: 'assistant',
      content: `✅ **${confirmText}**${noticeText}\n\n${nextStep?.question}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    messages.push(nextStepMsg);

    return {
      assistantMessages: messages,
      updatedSession,
      isCompleted: false
    };
  }
}
