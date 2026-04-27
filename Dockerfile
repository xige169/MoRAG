FROM continuumio/miniconda3:24.1.2-0

WORKDIR /app

RUN conda create -n agent python=3.11 -y

COPY requirements.txt .
RUN conda run -n agent pip install -r requirements.txt --no-cache-dir

COPY . .

RUN mkdir -p uploads

EXPOSE 8000

CMD ["conda", "run", "-n", "agent", "--no-capture-output", \
     "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
