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
INSERT INTO public.questions (subtopic_id, difficulty, qtype, prompt, options, answer_key, hints, explanation, example, image_url, example_image_url, enabled) VALUES
-- Array Easy
((SELECT id FROM public.subtopics WHERE key = 'array'), 'E', 'image_mcq',
 'Given the following values of a and the method doubleLast what will the values of a be after you execute: doubleLast()?',
 '["{-20, -10, 2, 8, 16, 60}","{-20, -10, 2, 4, 8, 30}","{-10, -5, 1, 8, 16, 60}","{-10, -5, 1, 4, 8, 30}"]',
 '["{-10, -5, 1, 8, 16, 60}"]',
 ARRAY['a.length = 6 → a.length/2 = 3', 'Loop visits indexes 3, 4, 5 only (i < 6).', 'Double a[i] at those indexes; others stay unchanged.'],
 'a.length is 6, so the loop starts at i = 6/2 = 3 and runs while i < 6 → indices 3, 4, 5 only.\nThose values (4, 8, 30) are doubled → (8, 16, 60). The first half stays the same.',
 'Figure example',
 'https://ekbussucjdicjvjdzqio.supabase.co/storage/v1/object/public/question-images/array/array-easy1.png',
 'https://ekbussucjdicjvjdzqio.supabase.co/storage/v1/object/public/question-images/array/array-easy1-exp.png',
 true),

-- Array Medium 1
((SELECT id FROM public.subtopics WHERE key = 'array'), 'M', 'image_mcq',
 'Given the following field and method declaration, what is the value in a[1] when m1(a) is run?',
 '["4","2","12","6"]',
 '["2"]',
 ARRAY['a[1]-- means the same as a[1] = a[1] - 1 (subtract 1 from the second element).', 'Arrays are references: changing a[1] inside the method changes the original array.', 'return (a[1] * 2) just gives back a number; it does not change what is stored in a[1].'],
 'The statement a[1]--; is the same as a[1] = a[1] - 1; so this will change the 3 to 2. \nThe return (a[1] * 2) does not change the value at a[1].',
 'Example',
 'https://ekbussucjdicjvjdzqio.supabase.co/storage/v1/object/public/question-images/array/array-m1.png',
 'https://ekbussucjdicjvjdzqio.supabase.co/storage/v1/object/public/question-images/array/array-m1-exp.png',
 true),

-- Array Medium 2
((SELECT id FROM public.subtopics WHERE key = 'array'), 'M', 'image_mcq',
 'Consider the following field arr and method checkArray. Which of the following best describes what checkArray returns?',
 '["Returns the index of the largest value in array arr.","Returns the index of the first element in array arr whose value is greater than arr[loc].","Returns the index of the last element in array arr whose value is greater than arr[loc].","Returns the index of the largest value in the second half of array arr."]',
 '["Returns the index of the largest value in array arr."]',
 ARRAY['loc starts at the middle, but the loop checks every index from 0 to n-1. So the start point is just the initial best.', 'The test if (arr[k] > arr[loc]) loc = k; keeps loc pointing to the best-so-far value seen while scanning left→right.', 'Because it uses > (not >=), equal values don''t replace loc. Think about which index is kept when there are duplicates.'],
 'This code sets loc to the middle of the array and then loops through all the array elements. If the value at the current index is greater than the value at loc then it changes loc to the current index. It returns loc, which is the index of the largest value in the array.',
 'Figure example',
 'https://ekbussucjdicjvjdzqio.supabase.co/storage/v1/object/public/question-images/array/array-m2.png',
 'https://ekbussucjdicjvjdzqio.supabase.co/storage/v1/object/public/question-images/array/array-m2-exp.png',
 true),

-- Array Hard 1
((SELECT id FROM public.subtopics WHERE key = 'array'), 'H', 'image_mcq',
 'Consider the following data field and incomplete method, partialSum, which is intended to return an integer array sum such that for all i, sum[i] is equal to arr[0] + arr[1] + ... + arr[i]. For instance, if arr contains the values {1, 4, 1, 3}, the array sum will contain the values {1, 5, 6, 9}. Which of the following is true about the two implementations of missing code on line 9 that are proposed?',
 '["Both implementations work as intended, but implementation 1 is faster than implementation 2.","Both implementations work as intended, but implementation 2 is faster than implementation 1.","Implementation 1 does not work as intended, because it will cause an ArrayIndexOutOfBoundsException.","Implementation 2 does not work as intended, because it will cause an ArrayIndexOutOfBoundsException."]',
 '["Implementation 1 does not work as intended, because it will cause an ArrayIndexOutOfBoundsException."]',
 ARRAY['Implementation 1: when j = 0, it tries to read sum[j - 1] → sum[-1].', 'Implementation 2: for each position j, it adds arr[0] + arr[1] + ... + arr[j] again from the start. That repeats work (1 add, then 2 adds, then 3 adds, …)', 'Reminder: arrays allow only 0 to length - 1. Anything else (like -1) is invalid.'],
 'when j = 0, it accesses sum[j - 1] → sum[-1], which is invalid. /nImplementation 2 works (it builds each prefix sum) but is slower O(n^2).',
 'Figure example',
 'https://ekbussucjdicjvjdzqio.supabase.co/storage/v1/object/public/question-images/array/array-hard1.png',
 'https://ekbussucjdicjvjdzqio.supabase.co/storage/v1/object/public/question-images/array/array-hard1-exp.png',
 true),

-- Array Hard 2
((SELECT id FROM public.subtopics WHERE key = 'array'), 'H', 'image_mcq',
 'Consider the following data field and method findLongest. Method findLongest is intended to find the longest consecutive block of the value target occurring in the array nums; however, findLongest does not work as intended. For example given the code below the call findLongest(10) should return 3, the length of the longest consecutive block of 10s. Which of the following best describes the value actually returned by a call to findLongest?',
 '["It is the length of the shortest consecutive block of the value target in nums","It is the length of the first consecutive block of the value target in nums","It is the number of occurrences of the value target in nums","It is the length of the last consecutive block of the value target in nums"]',
 '["It is the number of occurrences of the value target in nums"]',
 ARRAY['lenCount never resets. Add else { lenCount = 0; } when nums[k] != target to start a new streak.', 'maxLen only updates on a non-target because of else if. Consider updating maxLen whenever lenCount grows.', 'Trace with target=10: you will see lenCount just keeps increasing across the whole array.'],
 'lenCount is incremented on every target but never reset to 0 when a non-target is seen. So it accumulates all occurrences. maxLen gets set to lenCount at breaks (and once again after the loop), leaving the final value equal to the total count, not the longest consecutive block.',
 'Mini trace example',
 'https://ekbussucjdicjvjdzqio.supabase.co/storage/v1/object/public/question-images/array/array-hard2.png',
 'https://ekbussucjdicjvjdzqio.supabase.co/storage/v1/object/public/question-images/array/array-hard2-exp.png',
 true);

-- Insert sample questions for Linked List (1 Easy, 2 Medium, 2 Hard)
INSERT INTO public.questions (subtopic_id, difficulty, qtype, prompt, options, answer_key, hints, explanation, example, image_url, example_image_url, enabled) VALUES
-- Linked List Easy
((SELECT id FROM public.subtopics WHERE key = 'linked_list'), 'E', 'mcq',
 'A linked list contains a list pointer variable ______that stores the address of the first node of the list.',
 '["Head","NEXT","NULL","LAST"]',
 '["Head"]',
 ARRAY['It''s the pointer where traversal starts; from there you follow next links.', 'If the list is empty, this pointer is set to null.', 'Deleting the first node means updating this pointer to point to the second node.'],
 'In a linked list, the pointer/reference to the first node is commonly called the head (or head pointer). It stores the address of the first node; from it you can follow next links through the list.',
 'No example',
 null,
 null,
 true),

-- Linked List Medium 1
((SELECT id FROM public.subtopics WHERE key = 'linked_list'), 'M', 'image_mcq',
 'What is the output of following function in which start is pointing to the first node of the following linked list 1->2->3->4->5->6 ?',
 '["1 4 6 6 4 1","1 3 5 1 3 5","1 2 3 5","1 3 5 5 3 1"]',
 '["1 3 5 5 3 1"]',
 ARRAY['The function prints before and after the recursive call—so each visited node''s value appears twice.', 'The recursion jumps with start.next.next, so it visits nodes at odd positions: 1st, 3rd, 5th, …', 'Because the second print happens after recursion returns, the sequence becomes the reverse of the first half (a mirror).'],
 'fun(1): print 1, recurse to fun(3), then print 1.

fun(3): print 3, recurse to fun(5), then print 3.

fun(5): print 5, recurse to fun(null) (stops), then print 5.

Combined: 1 3 5 5 3 1.',
 'Figure Example',
 'https://ekbussucjdicjvjdzqio.supabase.co/storage/v1/object/public/question-images/linked-list/list-m1.png',
 'https://ekbussucjdicjvjdzqio.supabase.co/storage/v1/object/public/question-images/linked-list/list-m1-exp.png',
 true),

-- Linked List Medium 2
((SELECT id FROM public.subtopics WHERE key = 'linked_list'), 'M', 'image_mcq',
 'What does the following function do for a given Linked List with first node as head?',
 '["Prints all nodes of linked lists","Prints all nodes of linked list in reverse order","Prints alternate nodes of Linked List","Prints alternate nodes in reverse order"]',
 '["Prints all nodes of linked list in reverse order"]',
 ARRAY['The print happens after the recursive call, not before.', 'Each call moves to next node; recursion reaches the tail first.', 'As the calls return, nodes print from last back to first (reverse order).'],
 'The function first calls itself on head.next (go all the way to the end), and only after the recursive call returns it prints head.data. That post-order printing makes the values come out from tail to head.',
 'Figure example',
 'https://ekbussucjdicjvjdzqio.supabase.co/storage/v1/object/public/question-images/linked-list/list-m2.png',
 'https://ekbussucjdicjvjdzqio.supabase.co/storage/v1/object/public/question-images/linked-list/list-m2-exp.png',
 true),

-- Linked List Hard 1
((SELECT id FROM public.subtopics WHERE key = 'linked_list'), 'H', 'image_mcq',
 'The following  function takes a single-linked list of integers as a parameter and rearranges the elements of the list. The function is called with the list containing the integers 1, 2, 3, 4, 5, 6, 7 in the given order. What will be the contents of the list after the function completes execution?


',
 '["1,2,3,4,5,6,7","2,1,4,3,6,5,7","1,3,2,5,4,7,6","2,3,4,5,6,7,1"]',
 '["2,1,4,3,6,5,7"]',
 ARRAY['Track two pointers: p (current) and q = p.next (its neighbor).', 'Inside the loop, swap values of p and q, then jump two nodes: p = q.next; q = (p != null) ? p.next : null.', 'The loop handles nodes in pairs; if the list length is odd, the last node has no partner and is left as-is.'],
 'The function doesn''t move nodes, it swaps the values of neighbors.
It sets p to the current node and q to the next node, then swaps p.value with q.value.
After the swap, it advances p = q.next (i.e., jumps two nodes ahead) and sets q to p.next if it exists.
This means it processes the list in pairs: (1,2) → (2,1), then (3,4) → (4,3), then (5,6) → (6,5).
When there''s an odd last node (7), there is no partner to swap with, so it remains unchanged.
Therefore the final sequence is 2, 1, 4, 3, 6, 5, 7.',
 'Figure example',
 'https://ekbussucjdicjvjdzqio.supabase.co/storage/v1/object/public/question-images/linked-list/list-h1.png',
 'https://ekbussucjdicjvjdzqio.supabase.co/storage/v1/object/public/question-images/linked-list/list-h1-exp.png',
 true),

-- Linked List Hard 2
((SELECT id FROM public.subtopics WHERE key = 'linked_list'), 'H', 'image_mcq',
 'The following function reverse() is supposed to reverse a singly linked list. There is one line missing at the end of the function. What should be added in place of MISSING STATEMENT, so that the function correctly reverses a linked list.',
 '["Set the value of head_ref to prev;","Set the value of head_ref to current;","Set the value of head_ref to next;","Set the value of head_ref to NULL;"]',
 '["Set the value of head_ref to prev;"]',
 ARRAY['After each loop, prev points to the reversed prefix, current points to the next node to process.', 'The trio does: next = current.next → flip link current.next = prev → move forwarf prev = current, current = next.', 'When the loop ends (current == null), the new head is the variable that points to the reversed prefix—set the external head to that.'],
 'The missing statement should sets the value of *head_ref (which is a double pointer) to the value of prev, which is the new head of the reversed list.',
 'Figure example',
 'https://ekbussucjdicjvjdzqio.supabase.co/storage/v1/object/public/question-images/linked-list/list-h2.png',
 'https://ekbussucjdicjvjdzqio.supabase.co/storage/v1/object/public/question-images/linked-list/list-h2-exp.png',
 true);

-- Insert sample questions for Stack (1 Easy, 2 Medium, 2 Hard)
INSERT INTO public.questions (subtopic_id, difficulty, qtype, prompt, options, answer_key, hints, explanation, example, image_url, example_image_url, enabled) VALUES
-- Stack Easy
((SELECT id FROM public.subtopics WHERE key = 'stack'), 'E', 'mcq',
 'If the sequence of operations - push (1), push (2), pop, push (1), push (2), pop, pop, pop, push (2), pop are performed on a stack, the sequence of popped out values',
 '["2,2,1,1,2","2,2,1,2,2","2,1,2,2,1","2,1,2,2,2"]',
 '["2,2,1,1,2"]',
 ARRAY['Write the steps line by line and keep a tiny stack sketch (e.g., [1,2], top on the right).', 'Only record output when you see pop; write that value immediately.', 'Use LIFO: the last value pushed (and still on the stack) is the one that pops next.'],
 'Let''s simulate the sequence of operations on a stack:

Push(1): Stack = [1]
Push(2): Stack = [1, 2]
Pop: Pop 2, Stack = [1]
Push(1): Stack = [1, 1]
Push(2): Stack = [1, 1, 2]
Pop: Pop 2, Stack = [1, 1]
Pop: Pop 1, Stack = [1]
Pop: Pop 1, Stack = []
Push(2): Stack = [2]
Pop: Pop 2, Stack = []
The sequence of popped out values is: 2, 2, 1, 1, 2.
',
 'Figure example',
 null,
 'https://ekbussucjdicjvjdzqio.supabase.co/storage/v1/object/public/question-images/stack/stack-easy-exp.png',
 true),

-- Stack Medium 1
((SELECT id FROM public.subtopics WHERE key = 'stack'), 'M', 'image_mcq',
 'Following is an incorrect pseudocode for the algorithm which is supposed to determine whether a sequence of parentheses is balanced. Which of these unbalanced sequences options does the above code think is balanced? ',
 '["((())","())(()","(()()))","(()))()"]',
 '["((())"]',
 ARRAY['Think of a counter: ( = +1, ) = -1. If it ever goes negative, the code prints unbalanced.', 'Bug: after reading all chars, the code does not check if anything is left on the stack (counter > 0).', 'So pick the sequence where the counter never goes negative but ends > 0 (extra ( left).'],
 'Why this code is wrong: it never checks at the end whether the stack is empty—it always prints "balanced" after reading all characters.

So any string that never tries to pop from an empty stack (i.e., never has more ) than ( at any point) but ends with extra ( left will be (incorrectly) accepted.
((()) fits: it leaves one ( on the stack but the code still prints balanced.',
 'Figure Example',
 'https://ekbussucjdicjvjdzqio.supabase.co/storage/v1/object/public/question-images/stack/stack-m1.png',
 'https://ekbussucjdicjvjdzqio.supabase.co/storage/v1/object/public/question-images/stack/stack-m1-exp.png',
 true),

-- Stack Medium 2
((SELECT id FROM public.subtopics WHERE key = 'stack'), 'M', 'mcq',
 'The following postfix expression with single digit operands is evaluated using a stack:

8 2 3 ^ / 2 3 * + 5 1 * -

Note that ^ is the exponentiation operator. The top two elements of the stack after the first * is evaluated are:',
 '["6, 1","5, 7","3, 2","1, 5"]',
 '["6, 1"]',
 ARRAY['In postfix, for any operator: pop right (n = pop()), then left (m = pop()), compute m op n, push the result.', 'Go left→right and stop right after you evaluate the first *—don''t process later tokens.', 'Ignore normal precedence rules; just execute tokens in order (so handle ^ and / exactly when you reach them before that first *).'],
 'Quick trace (postfix stack):

8 2 3 ^ → push 8,2,3; ^ → 2^3=8 ⇒ stack [8, 8]

/ → 8/8=1 ⇒ [1]

2 3 → [1, 2, 3]

first * → 2*3=6 ⇒ [1, 6] → top two = 6, 1.',
 'Figure example',
 null,
 'https://ekbussucjdicjvjdzqio.supabase.co/storage/v1/object/public/question-images/stack/stack-m2-exp.png',
 true),

-- Stack Hard 1
((SELECT id FROM public.subtopics WHERE key = 'stack'), 'H', 'image_mcq',
 'Consider the following program. What is the output of the program for the following input ? 5 2 * 3 3 2 + * +',
 '["15","25","30","150"]',
 '["25"]',
 ARRAY['Read tokens left → right. If it''s a number, push it on the stack.', 'If it''s + or *, pop twice: let m = pop() (second top), n = pop() (top), then compute r = n + m or n * m, and push r.', 'At the end, the top of the stack (one number) is the output printed.'],
 ' The function of the program is:-
1) If the current character is a digit it pushes into stack
2) Else if the current character is operator,  it pops two elements and then performs the operation.
Finally it pushes the resultant element into stack.
Initially stack s is empty. 5 2 * 3 3 2 + * +
1) 5 -> It pushes into s
2) 2 -> It pushes into s
3) * -> It pops two elements n = 2, m=5 n*m = 10 It pushes 10 into s
4) 3 -> It pushes into s
5) 3 -> It pushes into s
6) 2 -> It pushes into s
7) + -> n=2, m=3 n+m=5 It pushes 5 into s
8) * -> n=5, m=3 n*m=15 It pushes 15 into s
9) + -> n=15, m=10 n+m = 25 It pushes 25 into s.
Result = 25
',
 'Figure Example',
 'https://ekbussucjdicjvjdzqio.supabase.co/storage/v1/object/public/question-images/stack/stack-h1.png',
 'https://ekbussucjdicjvjdzqio.supabase.co/storage/v1/object/public/question-images/stack/stack-h1-exp.png',
 true),

-- Stack Hard 2
((SELECT id FROM public.subtopics WHERE key = 'stack'), 'H', 'image_mcq',
 'What is the output? Given the input is: 2 4 5 6 7 0',
 '["0","2","4","6"]',
 '["2"]',
 ARRAY['Even number → push it; odd number → pop one (if stack not empty).', 'Input ends at 0; ignore 0 except for stopping.', 'Final answer = sum of what''s left on the stack after processing all numbers.'],
 'Push evens, pop once on odds.

Sequence: push 2 → push 4 → pop (5 removes 4) → push 6 → pop (7 removes 6) → stop at 0.

Stack left: [2]. Sum of remaining elements = 2.',
 'Figure example',
 'https://ekbussucjdicjvjdzqio.supabase.co/storage/v1/object/public/question-images/stack/stack-h2.png',
 'https://ekbussucjdicjvjdzqio.supabase.co/storage/v1/object/public/question-images/stack/stack-h2-exp.png',
 true);
