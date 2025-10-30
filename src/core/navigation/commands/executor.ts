/**
 * Command Executor
 *
 * Translates machine action intents into concrete graph mutation commands.
 * This is the only module that understands how to map actions to graph operations.
 *
 * Mapping rules:
 * - TO_SUCCESS_DANCE → INSERT_AFTER (success-dance scene) + NAVIGATE_TO
 * - TO_FAIL_DANCE → INSERT_AFTER (fail-dance scene) + NAVIGATE_TO
 * - SET_STATE → SET_NODE_STATE
 * - NAV_FORWARD → NAVIGATE_TO (next node)
 * - NAV_BACK → NAVIGATE_TO (prev node)
 * - INSERT_RESPONSE_SCENE → INSERT_AFTER (dialogue scene with AI response)
 * - CLEANUP_TEMP_NODES → DELETE_NODE (for each node)
 * - APPLY_GRAPH → (side effect: load graph into store, no command)
 * - SET_ACTIVE_NODE → NAVIGATE_TO (initial node)
 * - RESET_TEMP_NODES → (side effect: clear temp node tracking, no command)
 *
 * @module executor
 */

import type { NavigationAction, NavigationCommand, NavigationContext } from '../machine/types';
import { ulid } from 'ulid';
import { applyGraph, resetTempNodes } from './commandExecutor';

/**
 * Convert machine actions to graph commands
 *
 * This pure function takes the machine's context and a list of action intents,
 * and returns a list of concrete commands for the queue to execute.
 *
 * @param context - Current machine context for decision making
 * @param actions - Action intents emitted by the machine
 * @returns Array of commands to enqueue
 */
export function actionsToCommands(
  context: NavigationContext,
  actions: NavigationAction[]
): NavigationCommand[] {
  const commands: NavigationCommand[] = [];
  let actualFirstNodeId: string | null = null;

  for (const action of actions) {
    switch (action.type) {
      case 'TO_SUCCESS_DANCE': {
        // Create a new success-dance scene node and navigate to it
        const newNodeId = ulid();
        commands.push({
          type: 'INSERT_AFTER',
          afterNodeId: action.sourceNodeId,
          newNode: {
            nodeId: newNodeId,
            sceneId: `success-dance-${newNodeId}`,
            sceneKind: 'success-dance',
            sceneState: { type: 'static' },
            metadata: { temporary: true, source: 'machine' },
          },
        });
        commands.push({
          type: 'NAVIGATE_TO',
          targetNodeId: newNodeId,
        });
        break;
      }

      case 'TO_FAIL_DANCE': {
        // Create a new fail-dance scene node and navigate to it
        const newNodeId = ulid();
        commands.push({
          type: 'INSERT_AFTER',
          afterNodeId: action.sourceNodeId,
          newNode: {
            nodeId: newNodeId,
            sceneId: `fail-dance-${newNodeId}`,
            sceneKind: 'fail-dance',
            sceneState: { type: 'static' },
            metadata: { temporary: true, source: 'machine' },
          },
        });
        commands.push({
          type: 'NAVIGATE_TO',
          targetNodeId: newNodeId,
        });
        break;
      }

      case 'SET_STATE': {
        // Update the dialogue state of a specific node
        commands.push({
          type: 'SET_NODE_STATE',
          nodeId: action.nodeId,
          newState: { type: 'dialogue', state: action.dialogueState },
        });
        break;
      }

      case 'NAV_FORWARD': {
        // Translate to a command that uses store's advance() method
        // The store's advance() method respects locks and handles navigation
        console.log('[Executor] NAV_FORWARD from', action.fromNodeId);
        commands.push({
          type: 'ADVANCE',
          direction: 'forward',
        });
        break;
      }

      case 'NAV_BACK': {
        // Translate to a command that uses store's advance() method
        console.log('[Executor] NAV_BACK from', action.fromNodeId);
        commands.push({
          type: 'ADVANCE',
          direction: 'backward',
        });
        break;
      }

      case 'INSERT_RESPONSE_SCENE': {
        // Create a new dialogue scene with AI response
        const newNodeId = ulid();
        commands.push({
          type: 'INSERT_AFTER',
          afterNodeId: action.afterNodeId,
          newNode: {
            nodeId: newNodeId,
            sceneId: `ai-response-${newNodeId}`,
            sceneKind: 'dialogue',
            sceneState: {
              type: 'dialogue',
              state: 'basic',
            },
            metadata: {
              responseText: action.responseText,
              source: 'ai',
            },
          },
        });
        // Optionally navigate to the new scene
        commands.push({
          type: 'NAVIGATE_TO',
          targetNodeId: newNodeId,
        });
        break;
      }

      case 'CLEANUP_TEMP_NODES': {
        // Delete each temporary node
        for (const nodeId of action.nodeIds) {
          commands.push({
            type: 'DELETE_NODE',
            nodeId,
          });
        }
        break;
      }

      case 'LOG_ERROR': {
        // This doesn't produce a graph command, just log it
        console.error('[Machine Error]', action.context, action.error);
        break;
      }

      case 'APPLY_GRAPH': {
        // Apply the loaded graph to the store
        // This is a side effect, not a command, so we execute it immediately
        const result = applyGraph(action.graph);
        actualFirstNodeId = result.firstNodeId;
        break;
      }

      case 'SET_ACTIVE_NODE': {
        // Set the active node pointer
        // If we just loaded a graph, use the actual first node ID from the store
        // Otherwise, use the node ID from the action
        const nodeIdToUse = actualFirstNodeId || action.nodeId;
        console.log('[Executor] SET_ACTIVE_NODE to', nodeIdToUse, '(original:', action.nodeId, ')');

        if (nodeIdToUse) {
          commands.push({
            type: 'NAVIGATE_TO',
            targetNodeId: nodeIdToUse,
          });
        } else {
          console.warn('[Executor] Cannot create NAVIGATE_TO command - no valid node ID');
        }
        break;
      }

      case 'RESET_TEMP_NODES': {
        // Clear temporary node tracking
        // This is a side effect, not a command, so we execute it immediately
        resetTempNodes();
        break;
      }

      case 'UPDATE_NODE_PHASE': {
        // Update the phase field of a specific node
        console.log('[Executor] UPDATE_NODE_PHASE for node:', action.nodeId.substring(0, 8), '→', action.phase);
        commands.push({
          type: 'UPDATE_NODE_PHASE',
          nodeId: action.nodeId,
          phase: action.phase,
        });
        break;
      }

      default: {
        // TypeScript exhaustiveness check
        const _exhaustive: never = action;
        console.warn('[Executor] Unknown action type:', _exhaustive);
      }
    }
  }

  return commands;
}
