# 公开作品集版

## 用途

这是第三版中国汽车看板的GitHub Pages发布包。它保留70车系的两年累计分析与排名，不包含逐车系月度面板、原始CSV、采集响应和获取脚本。

线上地址：https://liushizhong201-code.github.io/china-auto-insight/

## 本地预览

在本目录启动静态文件服务器后打开`index.html`。直接使用`file://`也能打开，但发布前验收使用HTTP方式模拟GitHub Pages。

## 更新数据

在任务根目录运行：

```powershell
python scripts\build_public_site_payload.py
```

脚本会校验70个唯一车系、汇总对平和禁止字段，再生成`public-data.js`与`public-manifest.json`。

## 发布边界

远程仓库只提交以下文件：

- `index.html`
- `styles.css`
- `app.js`
- `public-data.js`
- `og.png`
- `.nojekyll`
- `README.md`
- `.gitignore`

`public-manifest.json`、`validation.json`和验收截图只用于本地交付核对，不进入正式Pages发布包。不得上传任务根目录、`dashboard`、`data`或`scripts`。
