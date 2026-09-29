#!/bin/bash
# site/ 폴더를 gh-pages 브랜치로 올려 GitHub Pages에 배포
cd "$(dirname "$0")"
git add -A && git -c user.name=wonjoon -c user.email=wjjjj29@gmail.com commit -qm "${1:-update}" 2>/dev/null
git push -q origin main
git push -q origin "$(git subtree split --prefix site main)":refs/heads/gh-pages --force && echo "배포 완료 → https://hellonunchi.com (반영 1~3분)"
