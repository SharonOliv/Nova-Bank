package com.bank.bank;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface HoldingRepository extends JpaRepository<Holding, Long> {
    List<Holding> findByOwner(String owner);
    void deleteByOwner(String owner);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select h from Holding h where h.owner = :o and h.asset = :a")
    Optional<Holding> lockByOwnerAndAsset(@Param("o") String owner, @Param("a") String asset);
}