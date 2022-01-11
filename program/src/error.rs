use num_derive::FromPrimitive;
use solana_program::program_error::ProgramError;
use thiserror::Error;

#[derive(Error, Debug, Copy, Clone, FromPrimitive, PartialEq)]
pub enum EchoError {
    #[error("Instruction not implemented.")]
    NotImplemented,
    #[error("The echo buffer from the account is not empty.")]
    EchoBufferNotEmpty,
}

impl From<EchoError> for ProgramError {
    fn from(e: EchoError) -> Self {
        ProgramError::Custom(e as u32)
    }
}
