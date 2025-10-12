// Mock questions data for CLES sessions development
// Following the specification schema with 10 questions covering all types

import { Question } from './questionTypes';

export const MOCK_QUESTIONS: Question[] = [
  // Q1 - Easy MCQ
  {
    id: "q1",
    subtopic_id: "arrays",
    difficulty: 1,
    qtype: "mcq",
    prompt: "Access by index in static array is:",
    options: [
      { key: "A", text: "O(n)" },
      { key: "B", text: "O(log n)" },
      { key: "C", text: "O(1)" },
      { key: "D", text: "O(n log n)" }
    ],
    answer_key: { correct: "C" },
    hint: "Think about direct indexing.",
    example: "arr[i] = base + i*size ⇒ O(1)",
    enabled: true
  },

  // Q2 - Easy MCQ
  {
    id: "q2",
    subtopic_id: "stacks",
    difficulty: 1,
    qtype: "mcq",
    prompt: "Which data structure follows LIFO (Last In, First Out) principle?",
    options: [
      { key: "A", text: "Queue" },
      { key: "B", text: "Stack" },
      { key: "C", text: "Array" },
      { key: "D", text: "Linked List" }
    ],
    answer_key: { correct: "B" },
    hint: "Think about how plates are stacked in a cafeteria.",
    example: "The last plate placed on top is the first one removed.",
    enabled: true
  },

  // Q3 - Easy MCQ
  {
    id: "q3",
    subtopic_id: "queues",
    difficulty: 1,
    qtype: "mcq",
    prompt: "Which data structure follows FIFO (First In, First Out) principle?",
    options: [
      { key: "A", text: "Stack" },
      { key: "B", text: "Queue" },
      { key: "C", text: "Tree" },
      { key: "D", text: "Graph" }
    ],
    answer_key: { correct: "B" },
    hint: "Think about people waiting in line.",
    example: "The first person in line is the first to be served.",
    enabled: true
  },

  // Q4 - Easy MCQ
  {
    id: "q4",
    subtopic_id: "linked_lists",
    difficulty: 1,
    qtype: "mcq",
    prompt: "What is the time complexity of inserting at the beginning of a linked list?",
    options: [
      { key: "A", text: "O(n)" },
      { key: "B", text: "O(log n)" },
      { key: "C", text: "O(1)" },
      { key: "D", text: "O(n²)" }
    ],
    answer_key: { correct: "C" },
    hint: "You only need to update the head pointer.",
    example: "newNode.next = head; head = newNode;",
    enabled: true
  },

  // Q5 - Medium Image MCQ
  {
    id: "q5",
    subtopic_id: "stacks",
    difficulty: 2,
    qtype: "image_mcq",
    prompt: "Which structure is shown in the image?",
    media: { imgUrl: "/mock/stack.png" },
    options: [
      { key: "A", text: "Queue" },
      { key: "B", text: "Stack" },
      { key: "C", text: "Deque" },
      { key: "D", text: "Heap" }
    ],
    answer_key: { correct: "B" },
    hint: "Look for the LIFO pattern in the structure.",
    example: "Elements are added and removed from the same end.",
    enabled: true
  },

  // Q6 - Medium Matching
  {
    id: "q6",
    subtopic_id: "data_structures",
    difficulty: 2,
    qtype: "matching",
    prompt: "Match each data structure with its characteristic:",
    pairs_left: ["Stack", "Queue", "BST"],
    pairs_right: ["LIFO", "FIFO", "Ordered by key"],
    answer_key: {
      map: {
        "Stack": "LIFO",
        "Queue": "FIFO",
        "BST": "Ordered by key"
      }
    },
    hint: "Think about the order of operations for each structure.",
    example: "Stack: last in, first out; Queue: first in, first out; BST: sorted by key values.",
    enabled: true
  },

  // Q7 - Medium Reorder
  {
    id: "q7",
    subtopic_id: "trees",
    difficulty: 2,
    qtype: "reorder",
    prompt: "Reorder the steps for in-order traversal of a BST:",
    sequence: ["Go Left", "Visit Node", "Go Right"],
    answer_key: {
      order: ["Go Left", "Visit Node", "Go Right"]
    },
    hint: "In-order traversal visits nodes in sorted order.",
    example: "Left → Root → Right gives you elements in ascending order.",
    enabled: true
  },

  // Q8 - Hard Short Answer
  {
    id: "q8",
    subtopic_id: "sorting",
    difficulty: 3,
    qtype: "short",
    prompt: "Name a stable O(n log n) comparison sort algorithm:",
    answer_key: { regex: "^(merge sort|mergesort)$" },
    hint: "Divide and conquer approach.",
    example: "Splits array in half, sorts each half, then merges them.",
    enabled: true
  },

  // Q9 - Hard MCQ
  {
    id: "q9",
    subtopic_id: "trees",
    difficulty: 3,
    qtype: "mcq",
    prompt: "What is the maximum height of a balanced binary search tree with n nodes?",
    options: [
      { key: "A", text: "O(1)" },
      { key: "B", text: "O(log n)" },
      { key: "C", text: "O(n)" },
      { key: "D", text: "O(n log n)" }
    ],
    answer_key: { correct: "B" },
    hint: "A balanced tree minimizes height.",
    example: "Each level can have at most 2^i nodes, so height is log₂(n).",
    enabled: true
  },

  // Q10 - Hard Matching
  {
    id: "q10",
    subtopic_id: "sorting",
    difficulty: 4,
    qtype: "matching",
    prompt: "Match each sorting algorithm with its time complexity:",
    pairs_left: ["Bubble Sort", "Quick Sort", "Merge Sort", "Heap Sort"],
    pairs_right: ["O(n²)", "O(n log n)", "O(n log n)", "O(n log n)"],
    answer_key: {
      map: {
        "Bubble Sort": "O(n²)",
        "Quick Sort": "O(n log n)",
        "Merge Sort": "O(n log n)",
        "Heap Sort": "O(n log n)"
      }
    },
    hint: "Consider the divide-and-conquer vs. comparison-based approaches.",
    example: "Bubble sort compares adjacent elements; others use more efficient strategies.",
    enabled: true
  }
];

// Helper function to get questions by difficulty
export function getQuestionsByDifficulty(difficulty: number): Question[] {
  return MOCK_QUESTIONS.filter(q => q.difficulty === difficulty);
}

// Helper function to get questions by type
export function getQuestionsByType(qtype: string): Question[] {
  return MOCK_QUESTIONS.filter(q => q.qtype === qtype);
}

// Helper function to get a random question
export function getRandomQuestion(): Question {
  const randomIndex = Math.floor(Math.random() * MOCK_QUESTIONS.length);
  return MOCK_QUESTIONS[randomIndex];
}


