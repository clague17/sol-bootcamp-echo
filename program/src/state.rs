use borsh::{BorshDeserialize, BorshSerialize};

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct Echo {
    pub data: Vec<u8>
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct AuthorizedBufferHeader {
    // TODO
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct VendingMachineBufferHeader {
    // TODO
}
