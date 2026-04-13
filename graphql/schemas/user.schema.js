const gql = String.raw;

const typeDefs = gql`
  type Users {
    UserID: Int!
    UserNameFirst: String!
    UserNameLast: String!
    DOB: String
    Gender: String
    Email: String!
    Mobile: String
    GoogleID: String
    Role: String!
    IsActive: Boolean!
    IsOnline: Boolean!
    IsApproved: Boolean!
    LastActiveAt: String
    CreatedAt: String!
    UpdateAt: String
    ProfileImageUrl: String
    ApprovedAt: String
    ApprovedByID: Int
    CurrentWarehouseName: String
    WarehouseID: Int
    WarehouseName: String
  }

  type AuthPayload {
    token: String!
    user: Users!
  }

  type UserBankAccounts {
    BankID: Int!
    UserID: Int!
    BankName: String
    AccountNo: String
    IFSC: String
    UPI: String
    BankImageUrl: String
    IsPrimary: Boolean!
    IsApproved: Boolean!
    ApprovedAt: String
    ApprovedByID: Int
    CreatedAt: String!
  }

  type UserDocuments {
    DocID: Int!
    UserID: Int!
    Type: String
    Number: String
    ImageURL: String
    IsApproved: Boolean!
    ApprovedAt: String
    ApprovedByID: Int
    CreatedAt: String!
  }

  type UserNominee {
    NomineeID: Int!
    UserID: Int!
    NomineeName: String
    Relation: String
    DOB: String
    Phone: String
    EmergencyPhone: String
    Address: String
    IsApproved: Boolean!
    ApprovedAt: String
    ApprovedByID: Int
    CreatedAt: String!
  }

  type LocationChangeRequest {
    RequestID: Int!
    UserID: Int!
    OldLocationID: Int
    NewLocationID: Int
    Type: String!
    Reason: String
    Status: String!
    RequestedAt: String!
    ApprovedAt: String
    ApprovedByID: Int
    User: Users
  }

  type Query {
    me: Users
    allUsers: [Users!]!
    allAdmins: [Users!]!
    pendingUsers: [Users!]!
    pendingAdmins: [Users!]!
    user(UserID: Int!): Users
    myBankAccounts: [UserBankAccounts!]!
    pendingBankAccounts: [UserBankAccounts!]!
    myDocuments: [UserDocuments!]!
    pendingDocuments: [UserDocuments!]!
    myNominees: [UserNominee!]!
    pendingNominees: [UserNominee!]!
    approvedUsers: [Users!]!
    approvedBankAccounts: [UserBankAccounts!]!
    approvedDocuments: [UserDocuments!]!
    approvedNominees: [UserNominee!]!
    myLocationChangeRequests: [LocationChangeRequest!]!
    pendingLocationChangeRequests: [LocationChangeRequest!]!
  }

  type Mutation {
    signup(
      UserNameFirst: String!
      UserNameLast: String!
      DOB: String!
      Gender: String!
      Email: String!
      Mobile: String!
      Password: String!
      Role: String
    ): AuthPayload!

    login(Mobile: String!, Password: String!): AuthPayload!

    googleAuth(
      token: String!
      Email: String!
      name: String!
      GoogleID: String!
      picture: String
    ): AuthPayload!

    updateUser(
      UserID: Int!
      UserNameFirst: String
      UserNameLast: String
      DOB: String
      Gender: String
      Email: String
      Mobile: String
      Role: String
      IsActive: Boolean
      WarehouseID: Int
    ): Users!

    promoteToAdmin(UserID: Int!): Users!

    demoteToUser(UserID: Int!): Users!

    updateMyProfile(
      UserNameFirst: String
      UserNameLast: String
      DOB: String
      Gender: String
      Email: String
      Mobile: String
    ): Users!

    updateOnlineStatus(IsOnline: Boolean!): Users!

    updateMobile(Mobile: String!): Users!

    deleteUser(UserID: Int!): Boolean!

    deactivateUser(UserID: Int!): Users!

    reactivateUser(UserID: Int!): Users!

    logout: Boolean!

    createSuperAdmin(Email: String!, Password: String!, Mobile: String!, UserNameFirst: String!, UserNameLast: String!): AuthPayload!

    forgotPassword(Email: String, Mobile: String): ForgotPasswordResponse!

    verifyOTP(Email: String, Mobile: String, otp: String!): VerifyOTPResponse!

    resetPassword(token: String!, newPassword: String!): ResetPasswordResponse!

    changePassword(currentPassword: String!, newPassword: String!): ResetPasswordResponse!

    approveUser(UserID: Int!): Users!

    rejectUser(UserID: Int!): Boolean!

    addBankAccount(
      BankName: String!
      AccountNo: String!
      IFSC: String!
      UPI: String
      BankImageUrl: String
      IsPrimary: Boolean
    ): UserBankAccounts!

    updateBankAccount(
      BankID: Int!
      BankName: String
      AccountNo: String
      IFSC: String
      UPI: String
      BankImageUrl: String
      IsPrimary: Boolean
    ): UserBankAccounts!

    deleteBankAccount(BankID: Int!): Boolean!

    approveBankAccount(BankID: Int!): UserBankAccounts!

    addDocument(
      Type: String!
      Number: String
      ImageURL: String
    ): UserDocuments!

    updateDocument(
      DocID: Int!
      Type: String
      Number: String
      ImageURL: String
    ): UserDocuments!

    deleteDocument(DocID: Int!): Boolean!
    approveDocument(DocID: Int!): UserDocuments!

    addNominee(
      NomineeName: String!
      Relation: String!
      DOB: String
      Phone: String
      EmergencyPhone: String
      Address: String
    ): UserNominee!

    updateNominee(
      NomineeID: Int!
      NomineeName: String
      Relation: String
      DOB: String
      Phone: String
      EmergencyPhone: String
      Address: String
    ): UserNominee!

    deleteNominee(NomineeID: Int!): Boolean!
    approveNominee(NomineeID: Int!): UserNominee!
    rejectNominee(NomineeID: Int!): Boolean!
    
    requestLocationChange(NewLocationID: Int!, Type: String!, Reason: String): LocationChangeRequest!
    approveLocationChange(RequestID: Int!): LocationChangeRequest!
    rejectLocationChange(RequestID: Int!): Boolean!
  }

  type ForgotPasswordResponse {
    success: Boolean!
    message: String!
  }

  type VerifyOTPResponse {
    success: Boolean!
    message: String!
    token: String
  }

  type ResetPasswordResponse {
    success: Boolean!
    message: String!
  }
`;

module.exports = typeDefs;
