export const AccessMapping = Object.freeze( {
	Auth: 0x69,
	Admin: 0x70,
	Registrar: 0x71,
	CollegeDean: 0x72,
	ProgramChair: 0x73,
	SpecializationChair: 0x74,
	Faculty: 0x75,
	Student: 0x76,
	Guest: 0x77,
});

export const ActionMapping = Object.freeze({
	all: 0x01,
	create: 0x02,
	delete: 0x04,
	download: 0x08,
	export: 0x10,
	import: 0x20,
	read: 0x40,
	update: 0x80,
});

export type AccessKey = keyof typeof AccessMapping;
export type ActionKey = keyof typeof ActionMapping;
export type AccessActionPair = `${AccessKey}:${ActionKey}`;

export const getAccessCode = (access: AccessKey): number => AccessMapping[access];
export const getActionCode = (action: ActionKey): number => ActionMapping[action];


// ["0x69:0x01", "0x70:0x02"] => ["Auth:all", "Admin:create"]
export const decodeAccessList = (accessListStrArray: string): AccessActionPair[] => {
    try {
        const accessList: string[] = JSON.parse(accessListStrArray);
        return accessList.map((accessStr) => {
            const [accessCodeStr, actionCodeStr] = accessStr.split(":");
            const accessCode = parseInt(accessCodeStr, 10);
            const actionCode = parseInt(actionCodeStr, 10);
            
            const accessKey: AccessKey | undefined = Object.keys(AccessMapping).find(key => AccessMapping[key as AccessKey] === accessCode) as AccessKey;
            const actionKey: ActionKey | undefined = Object.keys(ActionMapping).find(key => ActionMapping[key as ActionKey] === actionCode) as ActionKey;
            if (!accessKey || !actionKey) {
                throw new Error("Invalid access or action code.");
            }
            return `${accessKey}:${actionKey}` as AccessActionPair;
        });
    } catch {
        console.warn("Failed to decode access code. Invalid format.");
        return [];
    }
};


