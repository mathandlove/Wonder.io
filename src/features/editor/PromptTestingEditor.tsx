/**
 * Prompt Testing Editor Component
 *
 * A full-screen editor for testing and refining AI prompts used in metaflows.
 * Features:
 * - Left sidebar with list of metaflows to select from
 * - Center panel with editable prompt text and test interface
 * - Right panel showing AI response and conversation history
 */
import React, { useState, useEffect, useCallback } from 'react';
import { callAI, validateAnswer, type ConversationMessage } from '../ai/aiService';
import { API_ENDPOINTS } from '../../config';
import './PromptTestingEditor.css';

// ============================================================================
// Types
// ============================================================================

interface Deposition {
  character: string;
  title: string;
  content: string;
}

interface FlowItem {
  side?: 'left' | 'right';
  text?: string;
  type?: 'input' | 'quest';
}

interface CharacterFlowScene {
  type: 'character-flow';
  background?: string;
  'left-character'?: string;
  'right-character'?: string;
  CharacterDescription?: string;
  useClues?: boolean;
  monologue?: boolean;
  requiredAsk?: boolean;
  question?: string;
  successAnswer?: string;
  hint?: string;
  flow?: FlowItem[];
}

interface StoryData {
  title: string;
  storyId: string;
  scenes: any[];
  depositions?: Deposition[];
}

interface MetaflowInfo {
  index: number;
  scene: CharacterFlowScene;
  characterDescription: string;
  characterName: string;
  question: string;
  successAnswer: string;
  incorrectAnswer?: string[];
  leftCharacter?: string;
  rightCharacter?: string;
}

interface PromptTestingEditorProps {
  isActive: boolean;
  storyId: string;
  onClose?: () => void;
}

// Prompt testing modes
type PromptMode = 'validation' | 'wrong-response';

interface PromptModeConfig {
  id: PromptMode;
  label: string;
  description: string;
}

// ============================================================================
// Icons
// ============================================================================

const Icons = {
  back: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  send: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  sparkles: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
      <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  clear: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
      <path d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  spinner: (
    <svg className="prompt-testing-spinner" viewBox="0 0 24 24" fill="none" width="20" height="20">
      <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  ),
  copy: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

// ============================================================================
// Helper Functions
// ============================================================================

function getCharacterDescription(characterRef: string, depositions?: Deposition[]): string | null {
  if (!depositions) return null;
  const characterName = characterRef.endsWith('.txt') ? characterRef.slice(0, -4) : characterRef;
  const deposition = depositions.find(d => d.character === characterName);
  return deposition?.content ?? null;
}

// ============================================================================
// Cost Calculator
// ============================================================================

// GPT model pricing per 1M tokens (as of 2024)
const MODEL_PRICING = {
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'gpt-4': { input: 30.00, output: 60.00 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  // GPT-5 pricing (estimated based on current trends)
  'gpt-5-chat-latest': { input: 5.00, output: 15.00 },
};

// Simple token estimator (roughly 4 characters per token for English text)
function estimateTokens(text: string): number {
  if (!text) return 0;
  // More accurate estimation: count words and punctuation
  // Average is ~0.75 tokens per word for English
  const words = text.trim().split(/\s+/).length;
  const chars = text.length;
  // Use a blend of word-based and char-based estimation
  return Math.ceil((words * 1.3 + chars / 4) / 2);
}

interface CostEstimate {
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  model: string;
}

function calculateCost(promptText: string, expectedOutputTokens: number = 50): CostEstimate {
  const model = 'gpt-5-chat-latest';
  const pricing = MODEL_PRICING[model];
  const inputTokens = estimateTokens(promptText);

  // Cost = (tokens / 1,000,000) * price_per_million
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (expectedOutputTokens / 1_000_000) * pricing.output;

  return {
    inputTokens,
    outputTokens: expectedOutputTokens,
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
    model,
  };
}

// ============================================================================
// Metaflow List Item Component
// ============================================================================

interface MetaflowItemProps {
  metaflow: MetaflowInfo;
  isSelected: boolean;
  onClick: () => void;
}

function MetaflowItem({ metaflow, isSelected, onClick }: MetaflowItemProps) {
  return (
    <div
      className={`prompt-testing-metaflow-item ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <div className="prompt-testing-metaflow-header">
        <span className="prompt-testing-metaflow-index">#{metaflow.index + 1}</span>
        <span className="prompt-testing-metaflow-character">{metaflow.characterName}</span>
      </div>
      <div className="prompt-testing-metaflow-question">
        {metaflow.question || 'No question defined'}
      </div>
      <div className="prompt-testing-metaflow-characters">
        {metaflow.leftCharacter && <span className="left">{metaflow.leftCharacter}</span>}
        {metaflow.leftCharacter && metaflow.rightCharacter && <span className="separator">↔</span>}
        {metaflow.rightCharacter && <span className="right">{metaflow.rightCharacter}</span>}
      </div>
    </div>
  );
}

// ============================================================================
// Main PromptTestingEditor Component
// ============================================================================

const PromptTestingEditor: React.FC<PromptTestingEditorProps> = ({
  isActive,
  storyId,
  onClose,
}) => {
  // Data state
  const [storyData, setStoryData] = useState<StoryData | null>(null);
  const [metaflows, setMetaflows] = useState<MetaflowInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection state
  const [selectedMetaflowIndex, setSelectedMetaflowIndex] = useState<number | null>(null);

  // Prompt editing state
  const [editedPrompt, setEditedPrompt] = useState<string>('');
  const [hasPromptChanges, setHasPromptChanges] = useState(false);

  // Testing state
  const [userQuestion, setUserQuestion] = useState<string>('');
  const [isCallingAI, setIsCallingAI] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);

  // Answer validation state
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [validationPrompt, setValidationPrompt] = useState<string>('');
  const [validationResponse, setValidationResponse] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Editable metaflow fields (these affect story.json)
  const [editedExpectedAnswer, setEditedExpectedAnswer] = useState<string>('');
  const [editedPenalizedAnswers, setEditedPenalizedAnswers] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  // Clipboard state
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // ============================================================================
  // Data Loading
  // ============================================================================

  useEffect(() => {
    if (!isActive) return;

    const loadStory = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/stories/gingerbread.bundle/story.json`);
        if (!response.ok) throw new Error(`Failed to load story: ${response.status}`);
        const data: StoryData = await response.json();
        setStoryData(data);

        // Extract metaflows from scenes
        const extractedMetaflows: MetaflowInfo[] = [];
        data.scenes.forEach((scene, index) => {
          if (scene.type === 'character-flow' && scene.CharacterDescription) {
            const charDesc = getCharacterDescription(scene.CharacterDescription, data.depositions);
            if (charDesc) {
              extractedMetaflows.push({
                index,
                scene: scene as CharacterFlowScene,
                characterDescription: charDesc,
                characterName: scene.CharacterDescription,
                question: scene.question || '',
                successAnswer: scene.successAnswer || '',
                incorrectAnswer: scene.incorrectAnswer || scene.wrongAnswers,
                leftCharacter: scene['left-character'],
                rightCharacter: scene['right-character'],
              });
            }
          }
        });

        setMetaflows(extractedMetaflows);

        // Auto-select first metaflow
        if (extractedMetaflows.length > 0) {
          setSelectedMetaflowIndex(0);
          setEditedPrompt(extractedMetaflows[0].characterDescription);
          setEditedExpectedAnswer(extractedMetaflows[0].successAnswer);
          setEditedPenalizedAnswers(extractedMetaflows[0].incorrectAnswer?.join('\n') || '');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load story');
      } finally {
        setIsLoading(false);
      }
    };

    loadStory();
  }, [isActive, storyId]);

  // ============================================================================
  // Selection Handling
  // ============================================================================

  const handleMetaflowSelect = useCallback((index: number) => {
    setSelectedMetaflowIndex(index);
    const metaflow = metaflows[index];
    setEditedPrompt(metaflow.characterDescription);
    setHasPromptChanges(false);
    setConversationHistory([]);
    setUserQuestion('');
    setAiError(null);
    // Initialize editable fields from the selected metaflow
    setEditedExpectedAnswer(metaflow.successAnswer);
    setEditedPenalizedAnswers(metaflow.incorrectAnswer?.join('\n') || '');
    setSaveStatus('idle');
    // Keep the validation prompt and response - don't reset when switching metaflows
    // User wants to preserve their prompt while testing against different metaflows
  }, [metaflows]);

  // ============================================================================
  // Prompt Editing
  // ============================================================================

  const handlePromptChange = useCallback((value: string) => {
    setEditedPrompt(value);
    if (selectedMetaflowIndex !== null) {
      const original = metaflows[selectedMetaflowIndex].characterDescription;
      setHasPromptChanges(value !== original);
    }
  }, [metaflows, selectedMetaflowIndex]);

  const handleResetPrompt = useCallback(() => {
    if (selectedMetaflowIndex !== null) {
      setEditedPrompt(metaflows[selectedMetaflowIndex].characterDescription);
      setHasPromptChanges(false);
    }
  }, [metaflows, selectedMetaflowIndex]);

  // ============================================================================
  // AI Testing
  // ============================================================================

  const handleSendQuestion = useCallback(async () => {
    if (!userQuestion.trim() || isCallingAI) return;

    setIsCallingAI(true);
    setAiError(null);

    // Add user message to history
    const newUserMessage: ConversationMessage = {
      role: 'user',
      content: userQuestion,
    };

    const updatedHistory = [...conversationHistory, newUserMessage];
    setConversationHistory(updatedHistory);
    setUserQuestion('');

    try {
      const response = await callAI({
        questionText: userQuestion,
        characterDescription: editedPrompt,
        conversationHistory: conversationHistory,
      });

      if (response.success) {
        const assistantMessage: ConversationMessage = {
          role: 'assistant',
          content: response.text,
        };
        setConversationHistory([...updatedHistory, assistantMessage]);
      } else {
        setAiError(response.error || 'Failed to get AI response');
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsCallingAI(false);
    }
  }, [userQuestion, isCallingAI, editedPrompt, conversationHistory]);

  const handleClearConversation = useCallback(() => {
    setConversationHistory([]);
    setAiError(null);
  }, []);

  // ============================================================================
  // Answer Validation Testing
  // ============================================================================

  // Generate the default validation prompt - just the instructions
  // Dynamic data (question, expected answer, student answer, fail answers) are added when sending
  const generateDefaultPrompt = useCallback(() => {
    return `You are a friendly teacher evaluating whether a student's answer expresses
the same essential meaning as the expected answer. Judge based on meaning,
not exact details. Young children often omit or simplify descriptive
information—interpret generously.

You must return:
PASS or FAIL
and a short explanation.

-------------------------------------------
CORE MEANING RULE
-------------------------------------------
Identify the *core idea* of the expected answer.
Details such as color, size, age category, material, or adjectives are
NOT required for a PASS unless they change the fundamental meaning.

-------------------------------------------
PASS CONDITIONS
-------------------------------------------
PASS if the student's answer:
• conveys the same basic idea,
• correctly identifies the core item or concept,
• gives a simplified or partial version that still matches the meaning,
• uses a related or contextually equivalent term,
• omits non-essential modifiers but keeps the concept intact.

-------------------------------------------
FAIL CONDITIONS
-------------------------------------------
FAIL only if the student:
• gives a different or unrelated concept,
• contradicts the expected meaning,
• is too vague to show understanding,
• or replaces the idea with something meaningfully different.

-------------------------------------------
OUTPUT FORMAT (JSON)
You MUST respond with valid JSON in this exact format:
{"result": "PASS", "reasoning": "brief explanation"}
or
{"result": "FAIL", "reasoning": "brief explanation"}`;
  }, []);

  // Initialize prompt only on first load (when prompt is empty)
  useEffect(() => {
    if (!validationPrompt) {
      setValidationPrompt(generateDefaultPrompt());
    }
  }, [generateDefaultPrompt, validationPrompt]);

  // Update user answer without changing the prompt
  // User can manually edit the prompt if needed
  const handleUserAnswerChange = useCallback((newAnswer: string) => {
    setUserAnswer(newAnswer);
  }, []);

  const handleValidateAnswer = useCallback(async () => {
    if (!validationPrompt.trim() || isValidating) return;
    if (selectedMetaflowIndex === null) return;

    const metaflow = metaflows[selectedMetaflowIndex];

    setIsValidating(true);
    setAiError(null);
    setValidationResponse(null);

    try {
      // Build the full prompt with context, FAIL answers, and INPUT section
      // Uses the EDITED values, not the original metaflow values
      let fullPrompt = validationPrompt;

      // Add FAIL answers section if provided (from edited field, split by newlines)
      const failAnswersList = editedPenalizedAnswers.split('\n').filter(s => s.trim());
      if (failAnswersList.length > 0) {
        fullPrompt += `\n\n-------------------------------------------
FAIL ANSWERS
-------------------------------------------
The following answers should always result in FAIL:`;
        failAnswersList.forEach((failAnswer) => {
          fullPrompt += `\n• "${failAnswer.trim()}"`;
        });
      }

      // Add the INPUT section with Context
      fullPrompt += `\n\n-------------------------------------------
INPUT
Context: "${metaflow.characterDescription || ''}"
Question: "${metaflow.question || ''}"
Expected Answer: "${editedExpectedAnswer}"
Student Answer: "${userAnswer || ''}"`;


      // Call the prompt test endpoint (returns raw AI response)
      const response = await fetch(API_ENDPOINTS.AI_PROMPT_TEST, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: fullPrompt })
      });

      if (!response.ok) {
        throw new Error(`Validation failed: ${response.status}`);
      }

      const data = await response.json();
      setValidationResponse(data.response || 'No response');
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setIsValidating(false);
    }
  }, [validationPrompt, isValidating, selectedMetaflowIndex, metaflows, userAnswer, editedExpectedAnswer, editedPenalizedAnswers]);

  // Reset prompt to default
  const handleResetValidationPrompt = useCallback(() => {
    setValidationPrompt(generateDefaultPrompt());
  }, [generateDefaultPrompt]);

  // Build the full prompt for cost calculation (same logic as handleValidateAnswer)
  const buildFullPrompt = useCallback(() => {
    const metaflow = selectedMetaflowIndex !== null ? metaflows[selectedMetaflowIndex] : null;
    let fullPrompt = validationPrompt;

    // Add FAIL answers section if provided
    const failAnswersList = editedPenalizedAnswers.split('\n').filter(s => s.trim());
    if (failAnswersList.length > 0) {
      fullPrompt += `\n\n-------------------------------------------
FAIL ANSWERS
-------------------------------------------
The following answers should always result in FAIL:`;
      failAnswersList.forEach((failAnswer) => {
        fullPrompt += `\n• "${failAnswer.trim()}"`;
      });
    }

    // Add the INPUT section with Context
    fullPrompt += `\n\n-------------------------------------------
INPUT
Context: "${metaflow?.characterDescription || ''}"
Question: "${metaflow?.question || ''}"
Expected Answer: "${editedExpectedAnswer}"
Student Answer: "${userAnswer || ''}"`;

    return fullPrompt;
  }, [validationPrompt, selectedMetaflowIndex, metaflows, editedExpectedAnswer, userAnswer, editedPenalizedAnswers]);

  // Calculate cost estimate
  const costEstimate = calculateCost(buildFullPrompt(), 50); // Expect ~50 tokens for PASS/FAIL + reasoning

  // Save changes to story.json
  const handleSaveChanges = useCallback(async () => {
    if (selectedMetaflowIndex === null || !storyData) return;

    const metaflow = metaflows[selectedMetaflowIndex];
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      // Create updated story data
      const updatedStory = { ...storyData };
      const sceneIndex = metaflow.index;

      // Update the scene with edited values
      updatedStory.scenes[sceneIndex] = {
        ...updatedStory.scenes[sceneIndex],
        successAnswer: editedExpectedAnswer,
        incorrectAnswer: editedPenalizedAnswers.split('\n').filter(s => s.trim()),
      };

      // Save to backend
      const response = await fetch(`${API_ENDPOINTS.BUNDLE_HOTSPOTS.replace('/hotspots', '/story')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bundle: 'gingerbread.bundle',
          story: updatedStory
        })
      });

      if (!response.ok) {
        throw new Error(`Save failed: ${response.status}`);
      }

      // Update local state
      setStoryData(updatedStory);

      // Update metaflows array with new values
      const updatedMetaflows = [...metaflows];
      updatedMetaflows[selectedMetaflowIndex] = {
        ...metaflow,
        successAnswer: editedExpectedAnswer,
        incorrectAnswer: editedPenalizedAnswers.split('\n').filter(s => s.trim()),
      };
      setMetaflows(updatedMetaflows);

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to save:', err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }, [selectedMetaflowIndex, storyData, metaflows, editedExpectedAnswer, editedPenalizedAnswers]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendQuestion();
    }
  }, [handleSendQuestion]);

  // ============================================================================
  // Clipboard
  // ============================================================================

  const handleCopy = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  // ============================================================================
  // Render
  // ============================================================================

  if (!isActive) return null;

  if (isLoading) {
    return (
      <div className="prompt-testing-loading">
        <div className="prompt-testing-loading-content">
          {Icons.sparkles}
          <p>Loading metaflows...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="prompt-testing-error">
        <p>{error}</p>
        <button onClick={onClose}>Close</button>
      </div>
    );
  }

  const selectedMetaflow = selectedMetaflowIndex !== null ? metaflows[selectedMetaflowIndex] : null;

  return (
    <div className="prompt-testing">
      {/* Header */}
      <div className="prompt-testing-header">
        <div className="prompt-testing-header-left">
          <button onClick={onClose} className="prompt-testing-back-btn">
            {Icons.back}
            <span>Back to Editor</span>
          </button>
          <div className="prompt-testing-divider" />
          <div className="prompt-testing-title">
            {Icons.sparkles}
            <h1>Prompt Testing</h1>
          </div>
        </div>
        <div className="prompt-testing-header-right">
          <span className="prompt-testing-count">
            {metaflows.length} metaflow{metaflows.length !== 1 ? 's' : ''} found
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="prompt-testing-main">
        {/* Left Sidebar: Metaflow List */}
        <div className="prompt-testing-sidebar">
          <div className="prompt-testing-sidebar-header">
            <h3>Metaflows</h3>
          </div>
          <div className="prompt-testing-metaflow-list">
            {metaflows.map((metaflow, idx) => (
              <MetaflowItem
                key={metaflow.index}
                metaflow={metaflow}
                isSelected={selectedMetaflowIndex === idx}
                onClick={() => handleMetaflowSelect(idx)}
              />
            ))}
          </div>
        </div>

        {/* Center: Answer Validation Testing */}
        <div className="prompt-testing-center">
          {selectedMetaflow ? (
            <div className="prompt-testing-content">
              {/* Two Column Layout */}
              <div className="prompt-testing-columns">
                {/* Left Column: Configuration */}
                <div className="prompt-testing-column">
                  <div className="prompt-testing-section">
                    <h3 className="prompt-testing-section-title">Scene Configuration</h3>

                    {/* Question (read-only) */}
                    <div className="prompt-testing-field">
                      <label>Question</label>
                      <div className="prompt-testing-readonly">
                        {selectedMetaflow.question}
                      </div>
                    </div>

                    {/* Context (character deposition) - read-only, collapsible */}
                    <div className="prompt-testing-field">
                      <label>
                        Context <span className="prompt-testing-hint">(character deposition - auto-included in prompt)</span>
                      </label>
                      <div className="prompt-testing-context">
                        {selectedMetaflow.characterDescription || 'No context available'}
                      </div>
                    </div>

                    {/* Expected Answer */}
                    <div className="prompt-testing-field">
                      <label>Expected Answer</label>
                      <textarea
                        value={editedExpectedAnswer}
                        onChange={(e) => setEditedExpectedAnswer(e.target.value)}
                        placeholder="Enter the correct answer..."
                        rows={2}
                      />
                    </div>

                    {/* FAIL Answers */}
                    <div className="prompt-testing-field">
                      <label>FAIL Answers <span className="prompt-testing-hint">(one per line - these always result in FAIL)</span></label>
                      <textarea
                        value={editedPenalizedAnswers}
                        onChange={(e) => setEditedPenalizedAnswers(e.target.value)}
                        placeholder="Enter answers that should always fail..."
                        rows={3}
                      />
                    </div>

                    {/* Save Button */}
                    <button
                      className={`prompt-testing-save-btn ${saveStatus}`}
                      onClick={handleSaveChanges}
                      disabled={isSaving}
                    >
                      {isSaving ? Icons.spinner : saveStatus === 'saved' ? Icons.check : null}
                      <span>
                        {isSaving ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : saveStatus === 'error' ? 'Error' : 'Save Changes'}
                      </span>
                    </button>
                  </div>

                  {/* Validation Prompt Section */}
                  <div className="prompt-testing-section">
                    <div className="prompt-testing-section-header">
                      <h3 className="prompt-testing-section-title">Validation Prompt</h3>
                      <button
                        className="prompt-testing-text-btn"
                        onClick={handleResetValidationPrompt}
                      >
                        Reset
                      </button>
                    </div>
                    <textarea
                      className="prompt-testing-prompt-textarea"
                      value={validationPrompt}
                      onChange={(e) => setValidationPrompt(e.target.value)}
                      placeholder="Validation prompt..."
                      rows={8}
                      disabled={isValidating}
                    />
                  </div>
                </div>

                {/* Right Column: Testing */}
                <div className="prompt-testing-column">
                  <div className="prompt-testing-section">
                    <h3 className="prompt-testing-section-title">Test Answer</h3>

                    <div className="prompt-testing-field">
                      <label>Student Answer</label>
                      <textarea
                        value={userAnswer}
                        onChange={(e) => handleUserAnswerChange(e.target.value)}
                        placeholder="Type a student answer to test..."
                        rows={3}
                        disabled={isValidating}
                      />
                    </div>

                    <button
                      className="prompt-testing-validate-btn"
                      onClick={handleValidateAnswer}
                      disabled={!validationPrompt.trim() || !userAnswer.trim() || isValidating}
                    >
                      {isValidating ? Icons.spinner : Icons.send}
                      <span>{isValidating ? 'Validating...' : 'Run Validation'}</span>
                    </button>

                    {/* Cost Calculator */}
                    <div className="prompt-testing-cost-calculator">
                      <div className="prompt-testing-cost-header">
                        <span className="prompt-testing-cost-label">Estimated Cost</span>
                        <span className="prompt-testing-cost-model">{costEstimate.model}</span>
                      </div>
                      <div className="prompt-testing-cost-breakdown">
                        <div className="prompt-testing-cost-row">
                          <span>Input</span>
                          <span>{costEstimate.inputTokens} tokens</span>
                          <span>${costEstimate.inputCost.toFixed(6)}</span>
                        </div>
                        <div className="prompt-testing-cost-row">
                          <span>Output</span>
                          <span>~{costEstimate.outputTokens} tokens</span>
                          <span>${costEstimate.outputCost.toFixed(6)}</span>
                        </div>
                        <div className="prompt-testing-cost-row prompt-testing-cost-total">
                          <span>Total</span>
                          <span>{costEstimate.inputTokens + costEstimate.outputTokens} tokens</span>
                          <span>${costEstimate.totalCost.toFixed(6)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AI Response */}
                  <div className="prompt-testing-section">
                    <h3 className="prompt-testing-section-title">AI Response</h3>
                    {validationResponse ? (
                      <div className="prompt-testing-response">
                        {validationResponse}
                      </div>
                    ) : (
                      <div className="prompt-testing-response-empty">
                        Run validation to see the AI response
                      </div>
                    )}
                  </div>

                  {aiError && (
                    <div className="prompt-testing-error-message">
                      {aiError}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="prompt-testing-empty">
              <p>Select a metaflow from the list to begin testing</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default PromptTestingEditor;
