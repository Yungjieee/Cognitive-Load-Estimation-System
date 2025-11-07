"use client";

import { Question, Answer, MCQAnswer, MatchingAnswer, ReorderAnswer, ShortAnswer } from '@/lib/questionTypes';
import { useState } from 'react';
import ImageLightbox from './ImageLightbox';

interface QuestionRendererProps {
  question: Question;
  answer: Answer | null;
  onAnswerChange: (answer: Answer) => void;
  disabled?: boolean;
}

export default function QuestionRenderer({ question, answer, onAnswerChange, disabled = false }: QuestionRendererProps) {
  const [matchingPairs, setMatchingPairs] = useState<Record<string, string>>({});
  const [reorderItems, setReorderItems] = useState<string[]>(question.qtype === 'reorder' ? [...(question as any).sequence] : []);
  const [shortAnswer, setShortAnswer] = useState<string>('');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const handleMCQAnswer = (selected: string) => {
    onAnswerChange({ type: 'mcq', selected } as MCQAnswer);
  };

  const handleMatchingAnswer = (left: string, right: string) => {
    const newPairs = { ...matchingPairs, [left]: right };
    setMatchingPairs(newPairs);
    onAnswerChange({ type: 'matching', pairs: newPairs } as MatchingAnswer);
  };

  const handleReorderAnswer = (newOrder: string[]) => {
    setReorderItems(newOrder);
    onAnswerChange({ type: 'reorder', order: newOrder } as ReorderAnswer);
  };

  const handleShortAnswer = (text: string) => {
    setShortAnswer(text);
    onAnswerChange({ type: 'short', text } as ShortAnswer);
  };

  const renderMCQ = () => {
    const mcqQuestion = question as any;
    return (
      <div className="space-y-3">
        {mcqQuestion.options.map((option: any) => (
          <label key={option.key} className="flex items-center gap-4 cursor-pointer p-4 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-200">
            <input
              type="radio"
              name="answer"
              value={option.key}
              checked={(answer as MCQAnswer)?.selected === option.key}
              onChange={() => handleMCQAnswer(option.key)}
              disabled={disabled}
              className="w-5 h-5 text-purple-600 focus:ring-purple-500"
            />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {option.key}: {option.text}
            </span>
          </label>
        ))}
      </div>
    );
  };

  const renderImageMCQ = () => {
    const imageQuestion = question as any;
    return (
      <div className="space-y-4">
        {imageQuestion.media?.imgUrl && (
          <div className="flex justify-center">
            <div className="relative group">
              <img
                src={imageQuestion.media.imgUrl}
                alt="Question image"
                className="max-w-full h-auto rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setLightboxImage(imageQuestion.media.imgUrl)}
                onError={(e) => {
                  // Fallback for missing images
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                Click to zoom
              </div>
            </div>
          </div>
        )}
        {renderMCQ()}
      </div>
    );
  };

  const renderMatching = () => {
    const matchingQuestion = question as any;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Left Column</h4>
            <div className="space-y-2">
              {matchingQuestion.pairs_left.map((item: string, index: number) => (
                <div key={`left-${index}`} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Right Column</h4>
            <div className="space-y-2">
              {matchingQuestion.pairs_right.map((item: string, index: number) => (
                <select
                  key={`right-${index}`}
                  value={matchingPairs[item] || ''}
                  onChange={(e) => handleMatchingAnswer(item, e.target.value)}
                  disabled={disabled}
                  className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">Select match</option>
                  {matchingQuestion.pairs_left.map((leftItem: string) => (
                    <option key={leftItem} value={leftItem}>
                      {leftItem}
                    </option>
                  ))}
                </select>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderReorder = () => {
    const reorderQuestion = question as any;
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Drag and drop to reorder the items:
        </p>
        <div className="space-y-2">
          {reorderItems.map((item, index) => (
            <div
              key={item}
              className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-move hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              draggable={!disabled}
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', index.toString());
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
                const newItems = [...reorderItems];
                const draggedItem = newItems[dragIndex];
                newItems.splice(dragIndex, 1);
                newItems.splice(index, 0, draggedItem);
                handleReorderAnswer(newItems);
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderShortAnswer = () => {
    return (
      <div className="space-y-4">
        <textarea
          value={shortAnswer}
          onChange={(e) => handleShortAnswer(e.target.value)}
          disabled={disabled}
          placeholder="Enter your answer here..."
          className="w-full p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
          rows={3}
        />
      </div>
    );
  };

  const renderImageShort = () => {
    const imageQuestion = question as any;
    return (
      <div className="space-y-4">
        {imageQuestion.media?.imgUrl && (
          <div className="flex justify-center">
            <img
              src={imageQuestion.media.imgUrl}
              alt="Question image"
              className="max-w-full h-auto rounded-lg border border-gray-200 dark:border-gray-600"
              onError={(e) => {
                // Fallback for missing images
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}
        {renderShortAnswer()}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-gray-900 dark:text-white">
        {question.prompt}
      </h2>

      {question.qtype === 'mcq' && renderMCQ()}
      {question.qtype === 'image_mcq' && renderImageMCQ()}
      {question.qtype === 'matching' && renderMatching()}
      {question.qtype === 'reorder' && renderReorder()}
      {question.qtype === 'short' && renderShortAnswer()}
      {question.qtype === 'image_short' && renderImageShort()}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <ImageLightbox
          src={lightboxImage}
          alt="Question image"
          onClose={() => setLightboxImage(null)}
        />
      )}
    </div>
  );
}




