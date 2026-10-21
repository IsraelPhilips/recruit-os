import {describe,it,expect} from 'vitest';
import {encryptToken,decryptToken,formQuestions} from './google';

describe('Google connector contracts',()=>{
  it('encrypts refresh tokens before persistence',()=>{
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY='11'.repeat(32);
    const encrypted=encryptToken('synthetic-refresh-token');
    expect(encrypted).not.toContain('synthetic-refresh-token');
    expect(decryptToken(encrypted)).toBe('synthetic-refresh-token');
  });
  it('uses stable question IDs and finds the file upload question',()=>{
    const questions=formQuestions({formId:'synthetic-form',items:[{title:'Name',questionItem:{question:{questionId:'q1'}}},{title:'CV',questionItem:{question:{questionId:'q2',fileUploadQuestion:{}}}}]});
    expect(questions).toEqual([{id:'q1',title:'Name',isFile:false},{id:'q2',title:'CV',isFile:true}]);
  });
});
