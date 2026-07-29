import { Agent, ChatMessage, AgentStepState } from '../types';
import { AgentFlowRunner } from './AgentFlowRunner';
import { AgentSession } from '../agents/agentTypes';
import { AgentTemplateCompiler } from '../agents/AgentTemplateCompiler';

export class LocalAgentEngine {
  /**
   * Generates the initial welcome message and first question for an agent
   */
  static getInitialGreeting(agent: Agent): { message: ChatMessage; initialState: AgentStepState } {
    const { initialMessages, session } = AgentFlowRunner.initializeSession(agent);

    const initialState: AgentStepState = {
      currentStep: 0,
      answers: session.answers,
      attachedImage: null,
      attachedImageName: null,
      finalPrompt: null,
      isCompleted: false,
      flowSession: session,
    };

    return {
      message: initialMessages[0],
      initialState,
    };
  }

  /**
   * Processes a user response and advances the deterministic agent flow
   */
  static async processUserResponse(
    agent: Agent,
    userInput: string,
    imageAttached: { data: string; name: string } | null,
    currentState: AgentStepState
  ): Promise<{
    assistantMessages: ChatMessage[];
    nextState: AgentStepState;
  }> {
    // Retrieve or reconstruct session
    let session: AgentSession = currentState.flowSession;

    if (!session) {
      const config = AgentTemplateCompiler.compile(agent);
      session = {
        agentId: agent.id,
        currentStepId: config.steps[0]?.id || 'step-0',
        completedStepIds: [],
        answers: currentState.answers || {},
        attachedImages: currentState.attachedImage
          ? [{ data: currentState.attachedImage, name: currentState.attachedImageName || 'foto.png' }]
          : [],
        status: currentState.isCompleted ? 'completed' : 'in-progress',
        lastUpdated: new Date().toISOString(),
      };
    }

    const { assistantMessages, updatedSession, finalOutputs, isCompleted } = await AgentFlowRunner.processInput(
      agent,
      userInput,
      imageAttached,
      session
    );

    const nextState: AgentStepState = {
      ...currentState,
      answers: updatedSession.answers,
      attachedImage: imageAttached ? imageAttached.data : currentState.attachedImage,
      attachedImageName: imageAttached ? imageAttached.name : currentState.attachedImageName,
      finalPrompt: finalOutputs && finalOutputs[0] ? finalOutputs[0].content : currentState.finalPrompt,
      isCompleted: isCompleted || currentState.isCompleted,
      flowSession: updatedSession,
    };

    return {
      assistantMessages,
      nextState,
    };
  }

  /**
   * Generates the structured final prompt applying the agent's parameters
   */
  static async generateFinalPrompt(agent: Agent, state: AgentStepState): Promise<string> {
    if (state.finalPrompt) {
      return state.finalPrompt;
    }
    const config = AgentTemplateCompiler.compile(agent);
    const session: AgentSession = state.flowSession || {
      agentId: agent.id,
      currentStepId: 'completed',
      completedStepIds: [],
      answers: state.answers || {},
      attachedImages: [],
      status: 'completed',
      lastUpdated: new Date().toISOString(),
    };
    const outputs = (await AgentFlowRunner.processInput(agent, '', null, session)).finalOutputs;
    return outputs && outputs[0] ? outputs[0].content : 'Prompt Gerado com Sucesso.';
  }
}
