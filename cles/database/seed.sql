-- CLES Phase 2 Seed Data
-- Insert initial subtopics and sample questions

-- Insert subtopics (3 enabled, 3 locked)
INSERT INTO public.subtopics (key, name, description, enabled) VALUES
('array', 'Array', 'Basic array operations, indexing, and manipulation', true),
('linked_list', 'Linked List', 'Singly and doubly linked list operations', true),
('stack', 'Stack', 'Stack data structure and LIFO operations', true),
('queue', 'Queue', 'Queue data structure and FIFO operations', false),
('tree', 'Tree', 'Binary trees, traversal, and tree algorithms', false),
('sorting', 'Sorting', 'Various sorting algorithms and their complexities', false);

-- Insert sample questions for Array (1 Easy, 2 Medium, 2 Hard)
INSERT INTO public.questions (subtopic_id, difficulty, qtype, prompt, options, answer_key, hints, explanation, enabled) VALUES
-- Array Easy
((SELECT id FROM public.subtopics WHERE key = 'array'), 'E', 'mcq', 
 'What is the time complexity of accessing an element in an array by index?',
 '["O(1)", "O(n)", "O(log n)", "O(n²)"]',
 '["O(1)"]',
 ARRAY['Array access is direct - no searching required', 'Think about how arrays are stored in memory', 'The index directly maps to a memory location'],
 'Array access by index is O(1) because arrays store elements in contiguous memory locations, allowing direct access without searching.',
 true),

-- Array Medium 1
((SELECT id FROM public.subtopics WHERE key = 'array'), 'M', 'short',
 'Write a function to find the second largest element in an array. What is its time complexity?',
 null,
 '["O(n)"]',
 ARRAY['Keep track of the largest and second largest as you iterate', 'Handle edge cases like arrays with duplicate max values', 'Consider what happens with arrays of length 1 or 2'],
 'The optimal solution iterates through the array once, maintaining the largest and second largest elements, resulting in O(n) time complexity.',
 true),

-- Array Medium 2
((SELECT id FROM public.subtopics WHERE key = 'array'), 'M', 'mcq',
 'Which of the following operations has the worst time complexity for a dynamic array?',
 '["Access by index", "Insert at beginning", "Insert at end", "Delete at end"]',
 '["Insert at beginning"]',
 ARRAY['Think about what happens when you insert at the beginning', 'Consider how elements need to be shifted', 'Compare with inserting at the end'],
 'Insert at beginning is O(n) because all existing elements must be shifted one position to the right to make space.',
 true),

-- Array Hard 1
((SELECT id FROM public.subtopics WHERE key = 'array'), 'H', 'code',
 'Implement a function to find the maximum sum of any contiguous subarray (Kadane''s algorithm).',
 null,
 '["O(n)"]',
 ARRAY['Use dynamic programming approach', 'Keep track of current sum and maximum sum', 'Reset current sum to 0 if it becomes negative'],
 'Kadane''s algorithm uses dynamic programming to find the maximum subarray sum in O(n) time by maintaining the maximum sum ending at each position.',
 true),

-- Array Hard 2
((SELECT id FROM public.subtopics WHERE key = 'array'), 'H', 'short',
 'Given an array of integers, find two numbers that add up to a specific target. Optimize for time complexity.',
 null,
 '["O(n)"]',
 ARRAY['Use a hash map to store complements', 'For each number, check if its complement exists in the map', 'Trade space for time complexity'],
 'Use a hash map to store each number''s complement (target - number). For each element, check if its complement exists in the map, achieving O(n) time complexity.',
 true);

-- Insert sample questions for Linked List (1 Easy, 2 Medium, 2 Hard)
INSERT INTO public.questions (subtopic_id, difficulty, qtype, prompt, options, answer_key, hints, explanation, enabled) VALUES
-- Linked List Easy
((SELECT id FROM public.subtopics WHERE key = 'linked_list'), 'E', 'mcq',
 'What is the time complexity of inserting a new node at the beginning of a linked list?',
 '["O(1)", "O(n)", "O(log n)", "O(n²)"]',
 '["O(1)"]',
 ARRAY['No need to traverse the list', 'Just update the head pointer', 'The new node becomes the new head'],
 'Inserting at the beginning is O(1) because you only need to update the head pointer, regardless of the list size.',
 true),

-- Linked List Medium 1
((SELECT id FROM public.subtopics WHERE key = 'linked_list'), 'M', 'short',
 'How would you detect a cycle in a linked list? What is the time complexity?',
 null,
 '["O(n)"]',
 ARRAY['Use Floyd''s cycle detection algorithm', 'Use two pointers moving at different speeds', 'If there''s a cycle, the fast pointer will eventually meet the slow pointer'],
 'Floyd''s cycle detection uses two pointers (slow and fast) moving at different speeds. If there''s a cycle, they will eventually meet, giving O(n) time complexity.',
 true),

-- Linked List Medium 2
((SELECT id FROM public.subtopics WHERE key = 'linked_list'), 'M', 'mcq',
 'What is the main advantage of a doubly linked list over a singly linked list?',
 '["Faster insertion", "Less memory usage", "Bidirectional traversal", "Better cache performance"]',
 '["Bidirectional traversal"]',
 ARRAY['Think about what you can do with both next and previous pointers', 'Consider operations that require going backwards', 'Compare with singly linked list limitations'],
 'Doubly linked lists allow bidirectional traversal, making it easier to delete nodes and perform operations that require moving backwards in the list.',
 true),

-- Linked List Hard 1
((SELECT id FROM public.subtopics WHERE key = 'linked_list'), 'H', 'code',
 'Reverse a linked list in-place. What is the time and space complexity?',
 null,
 '["O(n) time, O(1) space"]',
 ARRAY['Use three pointers: prev, current, next', 'Iterate through the list reversing links', 'Don''t use recursion to maintain O(1) space'],
 'Use iterative approach with three pointers to reverse links in-place, achieving O(n) time and O(1) space complexity.',
 true),

-- Linked List Hard 2
((SELECT id FROM public.subtopics WHERE key = 'linked_list'), 'H', 'short',
 'Merge two sorted linked lists into one sorted list. Optimize for time complexity.',
 null,
 '["O(n + m)"]',
 ARRAY['Use a dummy head node', 'Compare elements from both lists', 'Attach the smaller element to the result list'],
 'Use a dummy head and compare elements from both lists, attaching the smaller element to the result. Time complexity is O(n + m) where n and m are the lengths of the two lists.',
 true);

-- Insert sample questions for Stack (1 Easy, 2 Medium, 2 Hard)
INSERT INTO public.questions (subtopic_id, difficulty, qtype, prompt, options, answer_key, hints, explanation, enabled) VALUES
-- Stack Easy
((SELECT id FROM public.subtopics WHERE key = 'stack'), 'E', 'mcq',
 'What principle does a stack follow?',
 '["FIFO (First In, First Out)", "LIFO (Last In, First Out)", "Random Access", "Priority-based"]',
 '["LIFO (Last In, First Out)"]',
 ARRAY['Think about how plates are stacked', 'The last item added is the first to be removed', 'Like a stack of books'],
 'Stacks follow LIFO (Last In, First Out) principle, meaning the most recently added element is the first to be removed.',
 true),

-- Stack Medium 1
((SELECT id FROM public.subtopics WHERE key = 'stack'), 'M', 'short',
 'How would you implement a stack using two queues? What is the time complexity of push and pop operations?',
 null,
 '["Push: O(1), Pop: O(n)"]',
 ARRAY['Use one queue for storage, another as temporary', 'For pop, move all elements except the last to the temporary queue', 'The last element is the one to be popped'],
 'Push is O(1) by adding to the main queue. Pop is O(n) because you need to move n-1 elements to the temporary queue to access the last element.',
 true),

-- Stack Medium 2
((SELECT id FROM public.subtopics WHERE key = 'stack'), 'M', 'mcq',
 'Which of the following is NOT a valid application of stacks?',
 '["Function call management", "Undo operations", "Expression evaluation", "Breadth-first search"]',
 '["Breadth-first search"]',
 ARRAY['Think about what data structure BFS uses', 'Stacks are used for depth-first traversal', 'BFS uses a queue, not a stack'],
 'Breadth-first search uses a queue (FIFO), not a stack. Stacks are used for function calls, undo operations, and expression evaluation.',
 true),

-- Stack Hard 1
((SELECT id FROM public.subtopics WHERE key = 'stack'), 'H', 'code',
 'Implement a stack that supports getMin() operation in O(1) time.',
 null,
 '["O(1) for all operations"]',
 ARRAY['Use an auxiliary stack to track minimums', 'When pushing, also push the current minimum to the auxiliary stack', 'When popping, also pop from the auxiliary stack'],
 'Use an auxiliary stack to store minimum values. For each push, push the current minimum to the auxiliary stack. This allows O(1) getMin() operation.',
 true),

-- Stack Hard 2
((SELECT id FROM public.subtopics WHERE key = 'stack'), 'H', 'short',
 'Evaluate a postfix expression using a stack. What is the time complexity?',
 null,
 '["O(n)"]',
 ARRAY['Process each token from left to right', 'Push operands onto stack', 'When you encounter an operator, pop two operands, compute, and push result'],
 'Process each token once: push operands, pop two operands when encountering operators, compute result and push back. Time complexity is O(n) where n is the number of tokens.',
 true);
