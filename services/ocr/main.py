from flask import Flask, request, jsonify
from datalab_sdk import DatalabClient, ConvertOptions
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)
client = DatalabClient(api_key=os.getenv('DATALAB_API_KEY'))  # Uses  env var


@app.route("/convert", methods=["POST"])
def convert_file():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]

    # Save temporarily
    temp_path = f"/tmp/{file.filename}"
    file.save(temp_path)

    options = ConvertOptions(
        output_format="markdown",  # Output format
        mode="balanced",  # Processing mode
        paginate=True,  # Add page delimiters
        disable_image_extraction=True,
        token_efficient_markdown=True,
    )

    result = client.convert(temp_path, options=options)

    if not result.success:
        return jsonify({"error": result.error}), 500

    return jsonify({
        "markdown": result.markdown,
        "page_count": result.page_count,
        "quality_score": result.parse_quality_score
    })


if __name__ == "__main__":
    app.run(debug=False, port=os.getenv('PORT', 3432))
