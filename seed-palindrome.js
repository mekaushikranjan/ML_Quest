const problem = {
    slug: 'palindromic-substrings',
    title: 'Palindromic Substrings',
    description: `Given a string \`s\`, return the number of palindromic substrings in it.

A string is a palindrome when it reads the same backward as forward.

A substring is a contiguous sequence of characters within the string.`,
    difficulty: 'medium',
    tags: ['string', 'dynamic-programming'],
    constraints: `- \`1 <= s.length <= 1000\`
- \`s\` consists of lowercase English letters.`,
    examples: [
        {
            input: '"abc"',
            output: '3',
            explanation: 'Three palindromic strings: "a", "b", "c".',
        },
        {
            input: '"aaa"',
            output: '6',
            explanation: 'Six palindromic strings: "a", "a", "a", "aa", "aa", "aaa".',
        },
    ],
    isPremium: false,
};

const testCases = {
    testCases: [
        { input: '"abc"\n', output: '3\n', isSample: true },
        { input: '"aaa"\n', output: '6\n', isSample: true },
        { input: '"a"\n', output: '1\n', isSample: false },
        { input: '"abccba"\n', output: '9\n', isSample: false },
        { input: '"racecar"\n', output: '10\n', isSample: false },
        { input: '"xxyyxx"\n', output: '11\n', isSample: false },
        { input: '"a'.repeat(100) + '"\n', output: '5050\n', isSample: false } // length 100 -> n*(n+1)/2 = 5050
    ],
};

async function seed() {
    try {
        const res = await fetch('http://localhost:3002/problems', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(problem),
        });
        const problemData = await res.json();

        if (!problemData.success) {
            console.error('Failed to create problem:', problemData);
            return;
        }

        console.log('Problem created:', problemData.data.id);

        const problemId = problemData.data.id;

        const tcRes = await fetch(`http://localhost:3002/problems/${problemId}/test-cases`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testCases),
        });

        const tcData = await tcRes.json();
        if (!tcData.success) {
            console.error('Failed to create test cases:', tcData);
            return;
        }

        console.log('Test cases created successfully!');
    } catch (err) {
        console.error('Error:', err);
    }
}

seed();
