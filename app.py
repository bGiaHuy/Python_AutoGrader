from flask import Flask, render_template, request, jsonify
import subprocess
import tempfile
import os
import sys
import time
import shutil

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

def normalize_output(text):
    """Normalize output for comparison: strip trailing spaces per line and trailing blank lines."""
    if not text:
        return ""
    lines = [line.rstrip() for line in text.splitlines()]
    while lines and lines[-1] == "":
        lines.pop()
    return '\n'.join(lines)

def run_single_test(code, input_data, expected_output, extra_files=None):
    """Run a single test case and return the result dict.
    
    extra_files: list of dicts with 'name' and 'content' keys.
                 These files will be written alongside the code so that
                 relative file reads (e.g. open('data.txt')) work.
    """
    expected_normalized = normalize_output(expected_output)

    # Create a temporary directory to hold the code AND any extra data files
    temp_dir = tempfile.mkdtemp()
    temp_code_path = os.path.join(temp_dir, 'code.py')

    try:
        # Write the code file
        with open(temp_code_path, 'w', encoding='utf-8') as f:
            f.write(code)

        # Write any extra files (e.g. data.txt) into the same directory
        if extra_files:
            for ef in extra_files:
                file_path = os.path.join(temp_dir, ef['name'])
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(ef['content'])

        start_time = time.time()

        process = subprocess.run(
            [sys.executable, temp_code_path],
            input=input_data,
            capture_output=True,
            text=True,
            timeout=5,
            cwd=temp_dir  # Run in the temp dir so relative paths work
        )

        end_time = time.time()
        execution_time = round((end_time - start_time) * 1000, 2)

        actual_output = process.stdout
        error_output = process.stderr
        actual_normalized = normalize_output(actual_output)

        if process.returncode != 0:
            status = "Error"
        elif actual_normalized == expected_normalized:
            status = "Passed"
        else:
            status = "Failed"

        return {
            "status": status,
            "actual_output": actual_output,
            "expected_output": expected_output,
            "error_output": error_output,
            "execution_time": execution_time
        }

    except subprocess.TimeoutExpired:
        return {
            "status": "Timeout",
            "actual_output": "",
            "expected_output": expected_output,
            "error_output": "Execution timed out after 5 seconds.",
            "execution_time": 5000
        }
    except Exception as e:
        return {
            "status": "Error",
            "actual_output": "",
            "expected_output": expected_output,
            "error_output": str(e),
            "execution_time": 0
        }
    finally:
        # Cleanup temp directory
        shutil.rmtree(temp_dir, ignore_errors=True)


@app.route('/grade', methods=['POST'])
def grade_code():
    """Grade code against a single test case (backward compat)."""
    data = request.get_json()
    code = data.get('code', '')
    input_data = data.get('input', '')
    expected_output = data.get('expected_output', '')
    extra_files = data.get('extra_files', [])

    if not code:
        return jsonify({"error": "No code provided"}), 400

    result = run_single_test(code, input_data, expected_output, extra_files)
    return jsonify(result)


@app.route('/grade_multiple', methods=['POST'])
def grade_multiple():
    """Grade code against multiple test cases and return summary + individual results."""
    data = request.get_json()
    code = data.get('code', '')
    test_cases = data.get('test_cases', [])
    extra_files = data.get('extra_files', [])

    if not code:
        return jsonify({"error": "No code provided"}), 400

    if not test_cases:
        return jsonify({"error": "No test cases provided"}), 400

    results = []
    for i, tc in enumerate(test_cases):
        result = run_single_test(
            code,
            tc.get('input', ''),
            tc.get('expected_output', ''),
            extra_files
        )
        result['test_case'] = i + 1
        result['test_name'] = tc.get('name', f'Test {i + 1}')
        results.append(result)

    passed = sum(1 for r in results if r['status'] == 'Passed')
    total = len(results)

    return jsonify({
        'passed': passed,
        'total': total,
        'results': results
    })


if __name__ == '__main__':
    app.run(debug=True, port=5000)
