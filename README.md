<div align="center">
AI简历制作，在线编辑简历模板，AI生成简历内容和个人总结等
</div>

## 功能特性

### AI 一键生成简历
- **文本输入**: 输入基本信息、工作经历等文本描述，AI自动生成结构化简历
- **文件上传**: 支持上传PDF、DOC、DOCX、图片格式的旧简历文件，AI自动识别并生成新简历
- **智能解析**: 使用OCR技术识别图片中的文字，使用专业库解析PDF和Word文档

## Run and deploy your web app

## Tips
* serve.ts和database.sqlite为临时测试服务，不再被使用
* backend为本项目nodejs后端，后端所有接口和数据都在此
* 登陆账号：admin  默认密码：123456

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
