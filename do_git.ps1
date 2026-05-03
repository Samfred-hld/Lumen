$git = "C:\Program Files\Git\cmd\git.exe"
& $git init
& $git config user.email "lumen@openclaw.ai"
& $git config user.name "Lúmen AI"
& $git remote add origin "https://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@github.com/Samfred-hld/Rattio.git"
& $git add .
& $git commit -m "feat: setup inicial via Lúmen AI"
& $git branch -M main
& $git push -u origin main --force
