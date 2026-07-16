document.addEventListener('DOMContentLoaded', () => {
    let testCaseCount = 0;
    let extraFiles = []; // Extra data files (e.g. data.txt) from folder upload

    // ========================
    // Test Case Management
    // ========================
    const container = document.getElementById('test-cases-container');
    const addBtn = document.getElementById('add-test-btn');

    function addTestCase(name = '', inputText = '', outputText = '') {
        testCaseCount++;
        const id = testCaseCount;
        const label = name || `Test ${id}`;

        const card = document.createElement('div');
        card.className = 'test-case-card';
        card.dataset.id = id;
        card.innerHTML = `
            <div class="test-case-header">
                <h3>${label}</h3>
                <button class="remove-btn" title="Remove test case">&times;</button>
            </div>
            <div class="test-case-body">
                <div class="io-group">
                    <label>
                        Input (stdin)
                        <label class="file-upload" style="margin:0">
                            <input type="file" class="tc-input-file" accept=".txt,.inp">
                            <span style="font-size:0.75rem;padding:0.15rem 0.5rem">Upload</span>
                        </label>
                    </label>
                    <textarea class="tc-input" placeholder="Enter input for this test case..." spellcheck="false">${escapeHtml(inputText)}</textarea>
                </div>
                <div class="io-group">
                    <label>
                        Expected Output
                        <label class="file-upload" style="margin:0">
                            <input type="file" class="tc-output-file" accept=".txt,.out">
                            <span style="font-size:0.75rem;padding:0.15rem 0.5rem">Upload</span>
                        </label>
                    </label>
                    <textarea class="tc-output" placeholder="Enter expected output..." spellcheck="false">${escapeHtml(outputText)}</textarea>
                </div>
            </div>
        `;

        // Remove button
        card.querySelector('.remove-btn').addEventListener('click', () => {
            card.style.animation = 'slideIn 0.2s ease-out reverse';
            setTimeout(() => card.remove(), 180);
        });

        // File upload for input
        card.querySelector('.tc-input-file').addEventListener('change', (e) => {
            readFileInto(e.target.files[0], card.querySelector('.tc-input'));
        });

        // File upload for output
        card.querySelector('.tc-output-file').addEventListener('change', (e) => {
            readFileInto(e.target.files[0], card.querySelector('.tc-output'));
        });

        container.appendChild(card);
    }

    addBtn.addEventListener('click', () => addTestCase());

    // Start with one empty test case
    addTestCase();

    // ========================
    // Single .py file upload
    // ========================
    document.getElementById('code-file').addEventListener('change', (e) => {
        readFileInto(e.target.files[0], document.getElementById('code-input'));
    });

    // ========================
    // Folder Upload & Auto-Detect
    // ========================
    document.getElementById('folder-input').addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        // Classify files
        let pyFile = null;
        const inputFiles = [];
        const outputFiles = [];
        const dataFiles = []; // Files that are not .py, not inp, not out (e.g. data.txt)

        for (const file of files) {
            const name = file.name.toLowerCase();

            // Skip hidden / system files
            if (name.startsWith('.')) continue;

            if (name.endsWith('.py')) {
                pyFile = file;
            } else if (isInputFile(name)) {
                inputFiles.push(file);
            } else if (isOutputFile(name)) {
                outputFiles.push(file);
            } else {
                // Extra data file (e.g. data.txt)
                dataFiles.push(file);
            }
        }

        if (!pyFile) {
            alert('No .py file found in the selected folder.');
            return;
        }

        // Read the .py file
        readFileInto(pyFile, document.getElementById('code-input'));

        // Read extra data files and store them for grading
        extraFiles = [];
        const dataPromises = dataFiles.map(f =>
            readFileAsync(f).then(content => {
                extraFiles.push({ name: f.name, content });
            })
        );

        // Sort input and output files for pairing
        inputFiles.sort((a, b) => naturalSort(a.name, b.name));
        outputFiles.sort((a, b) => naturalSort(a.name, b.name));

        // Clear existing test cases
        container.innerHTML = '';
        testCaseCount = 0;

        const maxCases = Math.max(inputFiles.length, outputFiles.length);

        if (maxCases === 0) {
            // No test case files found, just add an empty one
            addTestCase();
            return;
        }

        // Read files and create test cases
        const promises = [];
        for (let i = 0; i < maxCases; i++) {
            const inpFile = inputFiles[i] || null;
            const outFile = outputFiles[i] || null;
            const caseName = `Test ${i + 1}`;

            promises.push(
                Promise.all([
                    inpFile ? readFileAsync(inpFile) : Promise.resolve(''),
                    outFile ? readFileAsync(outFile) : Promise.resolve('')
                ]).then(([inpText, outText]) => {
                    addTestCase(caseName, inpText, outText);
                })
            );
        }

        // Wait for both data files and test case files to be read
        Promise.all([...dataPromises, ...promises]).then(() => {
            // Scroll to test cases
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    // ========================
    // Grade All Test Cases
    // ========================
    const gradeBtn = document.getElementById('grade-btn');
    const resultSection = document.getElementById('result-section');

    gradeBtn.addEventListener('click', async () => {
        const code = document.getElementById('code-input').value;
        if (!code.trim()) {
            alert('Please provide some Python code to grade.');
            return;
        }

        // Collect test cases from the UI
        const cards = container.querySelectorAll('.test-case-card');
        if (cards.length === 0) {
            alert('Please add at least one test case.');
            return;
        }

        const testCases = [];
        cards.forEach((card, idx) => {
            const name = card.querySelector('h3').textContent;
            const input = card.querySelector('.tc-input').value;
            const expected = card.querySelector('.tc-output').value;
            testCases.push({ name, input, expected_output: expected });
        });

        // UI feedback
        gradeBtn.textContent = '⏳ Grading...';
        gradeBtn.disabled = true;
        resultSection.classList.add('hidden');

        try {
            const response = await fetch('/grade_multiple', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, test_cases: testCases, extra_files: extraFiles })
            });

            const data = await response.json();

            if (response.ok) {
                renderResults(data);
            } else {
                alert(data.error || 'An error occurred while grading.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to reach the server. Make sure it is running.');
        } finally {
            gradeBtn.textContent = '⚡ Grade All Test Cases';
            gradeBtn.disabled = false;
        }
    });

    // ========================
    // Render Results
    // ========================
    function renderResults(data) {
        const { passed, total, results } = data;
        const resultSection = document.getElementById('result-section');
        const summaryBadge = document.getElementById('summary-badge');
        const summaryText = document.getElementById('summary-text');
        const progressBar = document.getElementById('progress-bar');
        const resultsList = document.getElementById('results-list');

        resultSection.classList.remove('hidden');

        // Summary
        summaryBadge.textContent = `${passed} / ${total}`;
        summaryBadge.className = 'summary-badge';
        summaryBadge.classList.add(passed === total ? 'all-passed' : 'some-failed');

        summaryText.textContent = passed === total
            ? 'All test cases passed!'
            : `${total - passed} test case(s) failed.`;

        // Progress bar
        const percent = total > 0 ? (passed / total) * 100 : 0;
        progressBar.style.width = `${percent}%`;
        progressBar.className = 'progress-bar';
        if (passed < total) progressBar.classList.add('has-failures');

        // Individual results
        resultsList.innerHTML = '';
        results.forEach((r) => {
            const statusClass = r.status.toLowerCase();
            const card = document.createElement('div');
            card.className = `result-card ${statusClass}`;

            card.innerHTML = `
                <div class="result-card-header">
                    <div class="result-card-header-left">
                        <span class="toggle-icon">▶</span>
                        <strong>${escapeHtml(r.test_name)}</strong>
                        <span class="badge ${statusClass}">${r.status}</span>
                    </div>
                    <div class="result-card-header-right">
                        <span class="time">${r.execution_time} ms</span>
                    </div>
                </div>
                <div class="result-card-detail">
                    ${r.error_output ? `
                        <div class="error-box">
                            <h4>Error / Stderr</h4>
                            <pre>${escapeHtml(r.error_output)}</pre>
                        </div>
                    ` : ''}
                    <div class="diff-section">
                        <div class="diff-box">
                            <h4>Actual Output</h4>
                            <pre>${escapeHtml(r.actual_output || '<No output>')}</pre>
                        </div>
                        <div class="diff-box">
                            <h4>Expected Output</h4>
                            <pre>${escapeHtml(r.expected_output || '<No output>')}</pre>
                        </div>
                    </div>
                </div>
            `;

            // Toggle detail
            const header = card.querySelector('.result-card-header');
            header.addEventListener('click', () => {
                const detail = card.querySelector('.result-card-detail');
                const icon = card.querySelector('.toggle-icon');
                detail.classList.toggle('open');
                icon.classList.toggle('open');
            });

            // Auto-expand failed/error cases
            if (r.status !== 'Passed') {
                card.querySelector('.result-card-detail').classList.add('open');
                card.querySelector('.toggle-icon').classList.add('open');
            }

            resultsList.appendChild(card);
        });

        resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // ========================
    // Utility Functions
    // ========================
    function readFileInto(file, textarea) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => { textarea.value = e.target.result; };
        reader.readAsText(file);
    }

    function readFileAsync(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    function isInputFile(name) {
        // Any file with "inp" in its name is treated as input
        return /inp/i.test(name);
    }

    function isOutputFile(name) {
        // Any file with "out" in its name is treated as output
        return /out/i.test(name);
    }

    function naturalSort(a, b) {
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});
