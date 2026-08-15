PYTHON := .venv/bin/python
PIP := .venv/bin/pip

.venv:
	python3 -m venv .venv

install: .venv
	$(PIP) install -r requirements.txt

dev: .venv
	$(PYTHON) -m uvicorn app.main:app --host 127.0.0.1 --port 4173 --reload

build: .venv
	$(PYTHON) -m compileall app

lint: .venv
	$(PYTHON) -m compileall app

typecheck: lint

clean:
	rm -rf app/__pycache__ app/**/__pycache__ data/posts.json

check: lint typecheck build
