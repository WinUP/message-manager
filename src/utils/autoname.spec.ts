import { autoname, toPascalCase, toCamelCase, toSnakeCase } from './autoname';

describe('autoname', () => {
    it('should create correct name in pascal case', () => {
        const data = { user: { mainRecord: { username: '' }, extraInfo: '' } };
        autoname(data, '/', toPascalCase);
        expect(data.user.mainRecord.username).toEqual('/User/MainRecord/Username');
        expect(data.user.extraInfo).toEqual('/User/ExtraInfo');
    });

    it('should create correct name in pascal case with prefix', () => {
        const data = { user: { mainRecord: { username: '' }, extraInfo: '' } };
        autoname(data, '/', 'storage://', toPascalCase);
        expect(data.user.mainRecord.username).toEqual('storage:///User/MainRecord/Username');
        expect(data.user.extraInfo).toEqual('storage:///User/ExtraInfo');
    });

    it('should create correct name in camel case', () => {
        const data = { user: { mainRecord: { username: '' }, extraInfo: '' } };
        autoname(data, '/', toCamelCase);
        expect(data.user.mainRecord.username).toEqual('/user/mainRecord/username');
        expect(data.user.extraInfo).toEqual('/user/extraInfo');
    });

    it('should create correct name in camel case with prefix', () => {
        const data = { user: { mainRecord: { username: '' }, extraInfo: '' } };
        autoname(data, '/', 'storage://', toCamelCase);
        expect(data.user.mainRecord.username).toEqual('storage:///user/mainRecord/username');
        expect(data.user.extraInfo).toEqual('storage:///user/extraInfo');
    });

    it('should create correct name in snack case', () => {
        const data = { user: { mainRecord: { username: '' }, extraInfo: '' } };
        autoname(data, '/', toSnakeCase);
        expect(data.user.mainRecord.username).toEqual('/user/main_record/username');
        expect(data.user.extraInfo).toEqual('/user/extra_info');
    });

    it('should create correct name in snack case with prefix', () => {
        const data = { user: { mainRecord: { username: '' }, extraInfo: '' } };
        autoname(data, '/', 'storage://', toSnakeCase);
        expect(data.user.mainRecord.username).toEqual('storage:///user/main_record/username');
        expect(data.user.extraInfo).toEqual('storage:///user/extra_info');
    });
});
