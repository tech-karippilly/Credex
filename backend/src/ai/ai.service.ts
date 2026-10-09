import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiService {
  private readonly client: GoogleGenerativeAI;
  private readonly modelName: string;

  constructor(private readonly configService: ConfigService) {
    this.client = new GoogleGenerativeAI(
      this.configService.getOrThrow<string>('gemini.apiKey'),
    );
    this.modelName = this.configService.getOrThrow<string>('gemini.model');
  }

  async generateText(prompt: string): Promise<string> {
    const model = this.client.getGenerativeModel({ model: this.modelName });
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    if (!text) {
      throw new Error('Gemini returned an empty response');
    }

    return text;
  }

  async generateWithInlineData(
    prompt: string,
    mimeType: string,
    base64Data: string,
  ): Promise<string> {
    const model = this.client.getGenerativeModel({ model: this.modelName });
    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      },
    ]);
    const text = result.response.text();

    if (!text) {
      throw new Error('Gemini returned an empty response');
    }

    return text;
  }
}
