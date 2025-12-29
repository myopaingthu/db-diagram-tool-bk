import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

@Injectable()
export class DatabaseService {
  constructor(
    @InjectModel("User") public readonly User: Model<any>,
    @InjectModel("Diagram") public readonly Diagram: Model<any>,
    @InjectModel("DiagramHistory") public readonly DiagramHistory: Model<any>
  ) {}
}

