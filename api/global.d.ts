import { Request } from "express";
import { DecodedIdToken } from "firebase-admin/auth";

declare global {
  namespace Express {
    namespace Multer {
      interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        destination: string;
        filename: string;
        path: string;
        buffer: Buffer;
      }
    }
  }

  interface RequestAuthorized extends Request {
    userId?: string;
    userEmail?: string;
    userRole?: string;
    userPermissions?: string[];
    firebaseUser?: DecodedIdToken;
  }
}

export {};