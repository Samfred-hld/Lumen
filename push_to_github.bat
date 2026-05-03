@echo off
echo ==============================================
echo Configurando o Git e enviando as alteracoes
echo ==============================================

echo [1/4] Configurando usuario...
git config user.email "lumen@openclaw.ai"
git config user.name "Lúmen AI"

echo [2/4] Configurando repositorio remoto...
git remote set-url origin https://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@github.com/Samfred-hld/Rattio.git || git remote add origin https://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@github.com/Samfred-hld/Rattio.git

echo [3/4] Preparando commit (modificacoes feitas pelo Lúmen AI no README.md)...
git add .
git commit -m "feat: configuração inicial por Lúmen AI"

echo [4/4] Enviando para o GitHub (push)...
git branch -M main
git push -u origin main

echo ==============================================
echo Processo finalizado! Se ocorreram erros, verifique acima.
echo ==============================================
pause
