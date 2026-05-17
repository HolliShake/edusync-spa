


export type AdminRoute =
    'dashboard'
    // Agency, Campus, Building, Room
    | 'agency'
    | `agency/${string}/campus/${number}`
    // Enrollment Backdoor
    | 'enrollment-backdoor'
    | 'enrollment-backdoor/faculty'
    | 'enrollment-backdoor/faculty/sections'
    | 'enrollment-backdoor/student'
    ;