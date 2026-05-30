
# Use the official Playwright image which includes Python and browsers
FROM mcr.microsoft.com/playwright:v1.41.0-jammy

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3-pip \
    python3-venv \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create a virtual environment
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Install python dependencies from requirements.txt
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    playwright install chromium && \
    playwright install-deps chromium

# Copy the application code
COPY . .

# Expose the port
EXPOSE 8001

# Command to run the application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001"]
